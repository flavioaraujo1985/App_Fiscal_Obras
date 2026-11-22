import { CheckCircle2, FileDown, Send, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AssinaturasPanel from '../../components/AssinaturasPanel';
import NotaFiscalCard from '../../components/NotaFiscalCard';
import StatusTag from '../../components/StatusTag';
import { medicaoService } from '../../services/medicao.service';
import { gerarPdfBoletimMedicao } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, Medicao } from '../../types';
import { formatCurrencyBR, formatDateBR } from '../../utils/engineering';

export default function ResumoMedicao({
  medicao,
  contrato,
  onIrParaItens,
}: {
  medicao: Medicao;
  contrato: Contrato;
  onIrParaItens?: () => void;
}) {
  const navigate = useNavigate();
  const {
    db,
    changeStatusMedicao,
    criarProcessoGefispag,
    saveNotaFiscalMedicao,
    removeNotaFiscalMedicao,
    addAssinaturaEntidade,
    removeAssinaturaEntidade,
    pushToast,
  } = useFiscalStore();
  const [notaFiscal, setNotaFiscal] = useState(
    medicao.notaFiscal?.numero ?? 'NF-e 000.419.105'
  );
  const [gerandoPdf, setGerandoPdf] = useState(false);

  useEffect(() => {
    if (medicao.notaFiscal?.numero) {
      setNotaFiscal(medicao.notaFiscal.numero);
    }
  }, [medicao.notaFiscal?.numero]);

  const ncsContrato = db.naoConformidades.filter((nc) => nc.contratoId === contrato.id);
  const garantiasContrato = db.garantias.filter((g) => g.contratoId === contrato.id);
  const totalExecutadoContrato = db.medicoes
    .filter((m) => m.contratoId === contrato.id && m.status !== 'REJEITADA' && m.status !== 'RASCUNHO')
    .reduce((acc, m) => acc + m.valor, 0);

  const req = medicaoService.verificarRequisitosAprovacao({
    contrato,
    garantias: garantiasContrato,
    ncs: ncsContrato,
    medicao,
    totalExecutadoContrato,
  });

  const acumuladoPercent = medicaoService.percentualAcumuladoContrato(contrato, db.medicoes);
  const processoExistente = db.processosGefispag.find((p) => p.medicaoId === medicao.id);

  const handleGerarPdf = async () => {
    setGerandoPdf(true);
    try {
      await gerarPdfBoletimMedicao({
        medicao,
        contrato,
        config: db.configuracoes,
        acumuladoPercent,
      });
      pushToast('success', 'Boletim de Medição exportado em PDF e salvo no dispositivo.');
    } finally {
      setGerandoPdf(false);
    }
  };

  const handleEnviarPagamento = async () => {
    if (processoExistente) {
      navigate('/gefispag');
      return;
    }
    const numeroNf = notaFiscal.trim() || medicao.notaFiscal?.numero || 'NF-e Pendente';
    await criarProcessoGefispag(medicao.id, numeroNf, medicao.notaFiscal);
    navigate('/gefispag');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-semibold text-[#004A8F] font-mono">
              BOLETIM DE MEDIÇÃO Nº {medicao.numero.toString().padStart(2, '0')}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Contrato {contrato.numero} — {contrato.contratada}
            </h2>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              Período: {formatDateBR(medicao.dataInicio)} a {formatDateBR(medicao.dataFim)} ·
              Competência: {medicao.competencia} · Fiscal: {contrato.fiscal}
              {medicao.notaFiscal?.numero ? ` · NF: ${medicao.notaFiscal.numero}` : ''}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <StatusTag
              label={medicao.status.replace('_', ' ')}
              tone={
                medicao.status === 'PAGA' || medicao.status === 'APROVADA'
                  ? 'success'
                  : medicao.status === 'REJEITADA'
                  ? 'error'
                  : 'info'
              }
            />
            <button
              type="button"
              disabled={gerandoPdf}
              onClick={() => void handleGerarPdf()}
              className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{gerandoPdf ? 'Gerando...' : 'Gerar PDF'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500">Valor desta Medição</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {formatCurrencyBR(medicao.valor)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">% sobre Contrato</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {medicao.percentual.toFixed(2)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Percentual Acumulado</div>
            <div className="text-lg font-bold font-mono tabular-nums text-[#004A8F] mt-0.5">
              {acumuladoPercent.toFixed(1)}%
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Itens / Memórias / Fotos</div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-0.5">
              {medicao.itensMedidos.filter((i) => i.quantidadeMedida > 0).length} ·{' '}
              {medicao.memoriasCalculo.length} · {medicao.fotos.length}
            </div>
          </div>
        </div>
      </div>

      {/* Nota Fiscal da Contratada */}
      <NotaFiscalCard
        notaFiscal={medicao.notaFiscal}
        valorSugerido={medicao.valor}
        contratada={contrato.contratada}
        onSave={(nf) => saveNotaFiscalMedicao(medicao.id, nf)}
        onDelete={() => removeNotaFiscalMedicao(medicao.id)}
      />

      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">
          Validações Automáticas para Aprovação e Pagamento
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
          {[
            { ok: req.vigenciaOk, label: 'Vigência do Contrato Ativa' },
            { ok: req.saldoOk, label: 'Saldo Contratual Suficiente' },
            { ok: req.garantiaOk, label: 'Garantia Contratual Vigente' },
            { ok: req.ncsMedirOk, label: 'Sem NC Crítica Bloqueante' },
            { ok: req.ncsPagarOk, label: 'Pendências de NCs Sanadas p/ Pagamento' },
            { ok: req.itensOk, label: 'Quantitativos Lançados na Planilha' },
          ].map((check) => (
            <div
              key={check.label}
              className={`p-3 rounded-md border flex items-center gap-2.5 ${
                check.ok
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50/60 border-red-200 text-red-900'
              }`}
            >
              {check.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span className="text-xs font-medium">{check.label}</span>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 no-print">
          <div className="flex flex-wrap items-center gap-2">
            {(medicao.status === 'RASCUNHO' || medicao.status === 'EM_ANALISE') && onIrParaItens && (
              <button
                type="button"
                onClick={onIrParaItens}
                className="px-4 py-2 text-xs font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 whitespace-nowrap shrink-0"
              >
                Inserir / Editar Itens
              </button>
            )}
            {medicao.status === 'RASCUNHO' && (
              <button
                type="button"
                onClick={() => changeStatusMedicao(medicao.id, 'EM_ANALISE')}
                className="px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
              >
                Enviar para Análise
              </button>
            )}
            {medicao.status === 'EM_ANALISE' && (
              <>
                <button
                  type="button"
                  disabled={!req.aptoAprovar}
                  onClick={() => changeStatusMedicao(medicao.id, 'APROVADA')}
                  className="px-4 py-2 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800 disabled:opacity-40"
                >
                  Aprovar Medição
                </button>
                <button
                  type="button"
                  onClick={() => changeStatusMedicao(medicao.id, 'REJEITADA')}
                  className="px-4 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
                >
                  Rejeitar
                </button>
              </>
            )}
          </div>

          {medicao.status === 'APROVADA' && !processoExistente && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={notaFiscal}
                onChange={(e) => setNotaFiscal(e.target.value)}
                placeholder="Nº Nota Fiscal"
                className="px-3 py-2 text-xs font-mono border border-slate-300 rounded-md w-44"
              />
              <button
                type="button"
                onClick={handleEnviarPagamento}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#00897B] rounded-md hover:bg-[#007367]"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Enviar para Pagamento (GEFISPAG)</span>
              </button>
            </div>
          )}

          {processoExistente && (
            <button
              type="button"
              onClick={() => navigate('/gefispag')}
              className="px-4 py-2 text-xs font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
            >
              Ver Processo {processoExistente.numeroProcesso} no GEFISPAG
            </button>
          )}
        </div>
      </div>

      {/* Campos de Assinatura Física do Boletim */}
      <AssinaturasPanel
        titulo="Campos de Assinatura Física do Boletim"
        documentoRef={`MED-${medicao.id}-${contrato.numero}`}
        assinaturas={medicao.assinaturas ?? []}
        presets={[
          {
            label: 'Fiscal',
            nome: contrato.fiscal,
            cargo: 'Fiscal do Contrato',
            registro: db.configuracoes.creaFiscal,
          },
          {
            label: 'Gestor',
            nome: contrato.gestor,
            cargo: 'Gestor do Contrato',
          },
          {
            label: 'Contratada',
            nome: contrato.contratada,
            cargo: 'Representante da Contratada',
            registro: contrato.cnpj,
          },
        ]}
        onAdd={(sig) => addAssinaturaEntidade('MEDICAO', medicao.id, sig)}
        onRemove={(sigId) => removeAssinaturaEntidade('MEDICAO', medicao.id, sigId)}
      />
    </div>
  );
}
