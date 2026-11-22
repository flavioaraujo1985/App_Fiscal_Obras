import { Download, FileDown } from 'lucide-react';
import { useState } from 'react';
import AssinaturasPanel from '../../components/AssinaturasPanel';
import StatCard from '../../components/StatCard';
import {
  type FotoPdfItem,
  gerarPdfRelatorioExecutivo,
  gerarPdfRelatorioFotografico,
} from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import {
  calcularSaldoContrato,
  calcularScoreContratada,
  formatCurrencyBR,
  formatDateBR,
} from '../../utils/engineering';

export default function RelatoriosPage() {
  const { db, selectedContratoId, addAssinaturaEntidade, removeAssinaturaEntidade, pushToast } =
    useFiscalStore();
  const [gerando, setGerando] = useState<string | null>(null);

  const contratos = db.contratos.filter(
    (c) => selectedContratoId === 'ALL' || c.id === selectedContratoId
  );
  const ncs = db.naoConformidades.filter(
    (nc) => selectedContratoId === 'ALL' || nc.contratoId === selectedContratoId
  );

  const abertas = ncs.filter((n) => n.status === 'ABERTA').length;
  const emTratamento = ncs.filter((n) => n.status === 'EM_TRATAMENTO').length;
  const encerradas = ncs.filter((n) => n.status === 'ENCERRADA').length;
  const criticas = ncs.filter((n) => n.gravidade === 'CRITICA' && n.status !== 'ENCERRADA').length;
  const score = calcularScoreContratada(ncs);

  const exportarPdf = async (tipo: 'CONSOLIDADO' | 'MEDICOES' | 'NCS' | 'AUDITORIA') => {
    setGerando(tipo);
    try {
      await gerarPdfRelatorioExecutivo({ db, contratos, ncs, tipo });
      pushToast('success', 'Relatório PDF gerado e salvo no dispositivo.');
    } finally {
      setGerando(null);
    }
  };

  const exportarPdfFotografico = async () => {
    setGerando('FOTOGRAFICO');
    try {
      const ctrIds = new Set(contratos.map((c) => c.id));
      const getCtrNum = (id: string) => db.contratos.find((c) => c.id === id)?.numero ?? id;
      const fotos: FotoPdfItem[] = [];
      for (const m of db.medicoes) {
        if (!ctrIds.has(m.contratoId)) continue;
        for (const f of m.fotos) {
          fotos.push({
            id: f.id,
            url: f.url,
            categoria: f.categoria,
            descricao: f.observacao,
            dataHora: f.dataHora,
            latitude: f.latitude,
            longitude: f.longitude,
            origem: `Medição nº ${m.numero} (${m.competencia})`,
            contratoNumero: getCtrNum(f.contratoId),
          });
        }
      }
      for (const d of db.diarios) {
        if (!ctrIds.has(d.contratoId)) continue;
        for (const f of d.fotos) {
          fotos.push({
            id: f.id,
            url: f.url,
            categoria: f.categoria,
            descricao: f.descricao,
            dataHora: f.dataHora,
            latitude: f.latitude,
            longitude: f.longitude,
            origem: `RDO ${formatDateBR(d.data)}`,
            contratoNumero: getCtrNum(f.contratoId),
          });
        }
      }

      await gerarPdfRelatorioFotografico({
        titulo: 'RELATÓRIO FOTOGRÁFICO CONSOLIDADO DE OBRAS',
        subtitulo: `Fiscalização de Obras · ${contratos.length} contrato(s) incluído(s)`,
        config: db.configuracoes,
        resumoInfo: [
          ['Contratos Abrangidos', contratos.map((c) => c.numero).join(', ') || 'Nenhum'],
          ['Fiscal Responsável', `${db.configuracoes.fiscalPadrao} (${db.configuracoes.creaFiscal})`],
          ['Gestor Responsável', db.configuracoes.gestorPadrao],
        ],
        fotos,
        assinaturas: db.assinaturasRelatorios ?? [],
        fileName: `relatorio-fotografico-geral-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      pushToast('success', 'Relatório Fotográfico em PDF gerado e salvo no dispositivo.');
    } finally {
      setGerando(null);
    }
  };

  const exportarCsvContratos = () => {
    const header = [
      'Numero',
      'Processo',
      'Contratada',
      'Status',
      'ValorInicial',
      'ValorAtual',
      'Executado',
      'Saldo',
      'Inicio',
      'Termino',
    ];
    const lines = contratos.map((c) => {
      const s = calcularSaldoContrato(c, db.aditivos, db.medicoes);
      return [
        c.numero,
        c.processo,
        `"${c.contratada}"`,
        c.status,
        s.valorInicial.toFixed(2),
        s.valorAtual.toFixed(2),
        s.executado.toFixed(2),
        s.saldo.toFixed(2),
        c.dataInicio,
        c.dataFim,
      ].join(';');
    });
    const csv = [header.join(';'), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fiscalobra-relatorio-contratos.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Relatórios Gerenciais & Auditoria
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Geração direta de arquivos PDF e planilhas CSV salvos localmente no dispositivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={exportarCsvContratos}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            <Download className="w-4 h-4" />
            <span>CSV Contratos</span>
          </button>
          <button
            type="button"
            disabled={gerando !== null}
            onClick={() => void exportarPdf('CONSOLIDADO')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{gerando === 'CONSOLIDADO' ? 'Gerando...' : 'PDF Contratos'}</span>
          </button>
          <button
            type="button"
            disabled={gerando !== null}
            onClick={() => void exportarPdf('MEDICOES')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#00897B] rounded-md hover:bg-[#007367] disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{gerando === 'MEDICOES' ? 'Gerando...' : 'PDF Medições'}</span>
          </button>
          <button
            type="button"
            disabled={gerando !== null}
            onClick={() => void exportarPdf('NCS')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{gerando === 'NCS' ? 'Gerando...' : 'PDF NCs'}</span>
          </button>
          <button
            type="button"
            disabled={gerando !== null}
            onClick={() => void exportarPdf('AUDITORIA')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{gerando === 'AUDITORIA' ? 'Gerando...' : 'PDF Auditoria'}</span>
          </button>
          <button
            type="button"
            disabled={gerando !== null}
            onClick={() => void exportarPdfFotografico()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50"
          >
            <FileDown className="w-4 h-4" />
            <span>{gerando === 'FOTOGRAFICO' ? 'Gerando...' : 'PDF Fotográfico'}</span>
          </button>
        </div>
      </div>

      {/* Relatório Consolidado de Contratos */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h2 className="text-base font-semibold text-slate-900">
          Posição Físico-Financeira dos Contratos
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
              <tr>
                <th className="px-3 py-2">Contrato</th>
                <th className="px-3 py-2">Contratada</th>
                <th className="px-3 py-2 text-right">Valor Atual</th>
                <th className="px-3 py-2 text-right">Executado</th>
                <th className="px-3 py-2 text-right">Saldo</th>
                <th className="px-3 py-2 text-right">% Exec.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {contratos.map((c) => {
                const s = calcularSaldoContrato(c, db.aditivos, db.medicoes);
                return (
                  <tr key={c.id} className="h-10">
                    <td className="px-3 py-2 font-mono font-semibold text-[#004A8F]">{c.numero}</td>
                    <td className="px-3 py-2 text-slate-900">{c.contratada}</td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatCurrencyBR(s.valorAtual)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-emerald-700 font-medium">
                      {formatCurrencyBR(s.executado)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums">
                      {formatCurrencyBR(s.saldo)}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                      {s.percentual.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Relatório de Não Conformidades */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Relatório Consolidado de Não Conformidades
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard title="Abertas" value={String(abertas)} />
          <StatCard title="Em Tratamento" value={String(emTratamento)} />
          <StatCard title="Encerradas" value={String(encerradas)} tone="success" />
          <StatCard title="Críticas Ativas" value={String(criticas)} tone={criticas > 0 ? 'danger' : 'success'} />
          <StatCard title="Score Contratada" value={`${score}/100`} />
        </div>
      </div>

      {/* Auditoria Geral */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Log de Auditoria de Atos Administrativos ({db.auditoria.length})
        </h2>
        <div className="divide-y divide-slate-100 text-xs">
          {db.auditoria.map((a) => (
            <div key={a.id} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="text-slate-700">
                <span className="font-mono text-slate-500 mr-2">{formatDateBR(a.data)}</span>
                <span className="font-semibold text-slate-900 mr-2">{a.usuario}</span>
                <span>{a.detalhes}</span>
              </div>
              <span className="font-mono text-slate-500 shrink-0">
                {a.entidade} · {a.acao}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Campos de Assinatura Física nos Relatórios */}
      <AssinaturasPanel
        titulo="Campos de Assinatura Física nos Relatórios"
        documentoRef="RELATORIO-GERENCIAL-FISCALOBRA"
        assinaturas={db.assinaturasRelatorios ?? []}
        presets={[
          {
            label: 'Fiscal Padrão',
            nome: db.configuracoes.fiscalPadrao,
            cargo: 'Fiscal do Contrato',
            registro: db.configuracoes.creaFiscal,
          },
          {
            label: 'Gestor Padrão',
            nome: db.configuracoes.gestorPadrao,
            cargo: 'Gestor do Contrato',
          },
        ]}
        onAdd={(sig) => addAssinaturaEntidade('RELATORIO', 'global', sig)}
        onRemove={(sigId) => removeAssinaturaEntidade('RELATORIO', 'global', sigId)}
      />
    </div>
  );
}
