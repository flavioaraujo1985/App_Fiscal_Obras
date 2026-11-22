import { ArrowLeft, ClipboardCheck, Edit3, FileDown, HardHat, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatCard from '../../components/StatCard';
import StatusTag from '../../components/StatusTag';
import { gerarPdfAvaliacaoDesempenho } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { AvaliacaoDesempenho, Contrato, Medicao } from '../../types';
import {
  calcularAvaliacaoDesempenho,
  criarItensAvaliacaoPadrao,
  formatCurrencyBR,
  formatDateBR,
  formatNumberBR,
} from '../../utils/engineering';
import AvaliacaoDesempenhoTab from '../medicoes/AvaliacaoDesempenhoTab';

export default function AvaliacoesDesempenhoPage() {
  const navigate = useNavigate();
  const { db, selectedContratoId, deleteAvaliacaoDesempenho, pushToast } = useFiscalStore();
  const [medicaoEditandoId, setMedicaoEditandoId] = useState<string | null>(null);
  const [gerandoPdfId, setGerandoPdfId] = useState<string | null>(null);
  const [medicaoParaExcluir, setMedicaoParaExcluir] = useState<Medicao | null>(null);

  const contratosFiltrados = useMemo(
    () =>
      db.contratos.filter(
        (c) => selectedContratoId === 'ALL' || c.id === selectedContratoId
      ),
    [db.contratos, selectedContratoId]
  );

  const medicoesOrdenadas = useMemo(() => {
    const ctrIds = new Set(contratosFiltrados.map((c) => c.id));
    return db.medicoes
      .filter((m) => ctrIds.has(m.contratoId))
      .sort((a, b) => {
        if (a.contratoId !== b.contratoId) {
          return a.contratoId.localeCompare(b.contratoId);
        }
        return b.numero - a.numero;
      });
  }, [db.medicoes, contratosFiltrados]);

  const avaliadas = useMemo(
    () => medicoesOrdenadas.filter((m) => Boolean(m.avaliacaoDesempenho)),
    [medicoesOrdenadas]
  );

  const mediaGeralMaa = useMemo(() => {
    if (avaliadas.length === 0) return 0;
    const sum = avaliadas.reduce(
      (acc, m) => acc + (m.avaliacaoDesempenho?.maa ?? 0),
      0
    );
    return sum / avaliadas.length;
  }, [avaliadas]);

  const mediaGeralNma = useMemo(() => {
    if (avaliadas.length === 0) return 0;
    const sum = avaliadas.reduce(
      (acc, m) => acc + (m.avaliacaoDesempenho?.nma ?? 0),
      0
    );
    return sum / avaliadas.length;
  }, [avaliadas]);

  const medicaoSelecionada = useMemo(
    () => db.medicoes.find((m) => m.id === medicaoEditandoId),
    [db.medicoes, medicaoEditandoId]
  );
  const contratoSelecionado = useMemo(
    () =>
      medicaoSelecionada
        ? db.contratos.find((c) => c.id === medicaoSelecionada.contratoId)
        : undefined,
    [db.contratos, medicaoSelecionada]
  );

  const buildSyncedPayloadForPdf = (
    medicao: Medicao,
    contrato: Contrato
  ): AvaliacaoDesempenho => {
    if (medicao.avaliacaoDesempenho) {
      return medicao.avaliacaoDesempenho;
    }

    const prevMed = db.medicoes
      .filter(
        (m) =>
          m.contratoId === contrato.id &&
          m.numero < medicao.numero &&
          Boolean(m.avaliacaoDesempenho)
      )
      .sort((a, b) => b.numero - a.numero)[0];

    const prev = prevMed?.avaliacaoDesempenho;
    const itens = criarItensAvaliacaoPadrao();
    const mediaAnterior = prev && Number.isFinite(prev.maa) ? prev.maa : null;
    const calc = calcularAvaliacaoDesempenho(itens, mediaAnterior);

    return {
      medicaoId: medicao.id,
      diretoria: prev?.diretoria ?? '',
      regional: prev?.regional ?? '',
      gerencia: prev?.gerencia ?? '',
      unidade: prev?.unidade ?? db.configuracoes.secretaria ?? '',
      endereco: prev?.endereco ?? '',
      bairro: prev?.bairro ?? '',
      cidade: prev?.cidade ?? contrato.municipio ?? '',
      cep: prev?.cep ?? '',
      telefone: prev?.telefone ?? '',
      itens,
      mediaAnterior,
      nma: calc.nma,
      maa: calc.maa,
      descumpriuClausula: false,
      observacoes: '',
      avaliadores:
        prev?.avaliadores && prev.avaliadores.length === 3
          ? prev.avaliadores
          : [
              {
                papel: 'Fiscal avaliador 01',
                nome: contrato.fiscal,
                cargoRegistro: db.configuracoes.creaFiscal || 'Fiscal do Contrato',
                matricula: '',
                portaria: '',
              },
              {
                papel: 'Fiscal avaliador 02',
                nome: '',
                cargoRegistro: '',
                matricula: '',
                portaria: '',
              },
              {
                papel: 'Gestor avaliador 03',
                nome: contrato.gestor,
                cargoRegistro: 'Gestor do Contrato',
                matricula: '',
                portaria: '',
              },
            ],
      atualizadoEm: new Date().toISOString(),
    };
  };

  const handleGerarPdf = async (medicao: Medicao, contrato: Contrato) => {
    setGerandoPdfId(medicao.id);
    try {
      const avaliacao = buildSyncedPayloadForPdf(medicao, contrato);
      await gerarPdfAvaliacaoDesempenho({
        avaliacao,
        medicao,
        contrato,
        aditivos: db.aditivos,
        config: db.configuracoes,
      });
      pushToast(
        'success',
        `Avaliação de Desempenho nº ${medicao.numero.toString().padStart(2, '0')} exportada em PDF.`
      );
    } finally {
      setGerandoPdfId(null);
    }
  };

  if (medicaoSelecionada && contratoSelecionado) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setMedicaoEditandoId(null)}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 no-print"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Voltar para Lista de Avaliações de Desempenho</span>
          </button>
          <button
            type="button"
            onClick={() => navigate(`/medicoes/${medicaoSelecionada.id}`)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004A8F] bg-white border border-slate-300 rounded-md hover:bg-slate-50 no-print"
          >
            <HardHat className="w-3.5 h-3.5" />
            <span>Abrir Boletim de Medição Completo</span>
          </button>
        </div>

        <AvaliacaoDesempenhoTab
          medicao={medicaoSelecionada}
          contrato={contratoSelecionado}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Avaliação de Desempenho
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Preenchimento das avaliações por Boletim de Medição e geração direta em PDF com
            cálculo automático de NMA e MAA.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Boletins de Medição"
          value={String(medicoesOrdenadas.length)}
          subtitle="Disponíveis para avaliação"
        />
        <StatCard
          title="Avaliações Registradas"
          value={String(avaliadas.length)}
          tone={avaliadas.length > 0 ? 'success' : 'default'}
        />
        <StatCard
          title="Média NMA"
          value={avaliadas.length > 0 ? formatNumberBR(mediaGeralNma) : '—'}
          subtitle="Nota Média no Período"
        />
        <StatCard
          title="Média MAA"
          value={avaliadas.length > 0 ? formatNumberBR(mediaGeralMaa) : '—'}
          subtitle="Média Atual Acumulada"
          tone="success"
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4 text-[#004A8F]" />
            <h2 className="text-sm font-semibold text-slate-900">
              Avaliações por Boletim de Medição ({medicoesOrdenadas.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Nº, Data e Valor R$ vinculados automaticamente a cada medição
          </span>
        </div>

        {medicoesOrdenadas.length === 0 ? (
          <div className="p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700">
              Nenhum Boletim de Medição cadastrado para os contratos selecionados.
            </p>
            <p className="text-xs text-slate-500">
              Crie um Boletim de Medição primeiro para vincular a Avaliação de Desempenho.
            </p>
            <button
              type="button"
              onClick={() => navigate('/medicoes')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>Ir para Medições</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {medicoesOrdenadas.map((m) => {
              const ctr = db.contratos.find((c) => c.id === m.contratoId);
              if (!ctr) return null;
              const av = m.avaliacaoDesempenho;
              const numFmt = m.numero.toString().padStart(2, '0');

              return (
                <div
                  key={m.id}
                  className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-slate-50/60"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-slate-900">
                        Avaliação nº {numFmt} · Boletim de Medição nº {numFmt}
                      </span>
                      <StatusTag
                        label={av ? 'Avaliada' : 'Pendente'}
                        tone={av ? 'success' : 'warning'}
                      />
                      {av?.descumpriuClausula && (
                        <StatusTag label="Cláusula descumprida" tone="error" />
                      )}
                    </div>
                    <div className="text-xs text-slate-600 truncate">
                      <span className="font-mono font-semibold text-[#004A8F]">
                        {ctr.numero}
                      </span>{' '}
                      · {ctr.contratada}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        Data:{' '}
                        <strong className="font-mono text-slate-800">
                          {formatDateBR(m.dataFim)}
                        </strong>
                      </span>
                      <span>
                        Competência:{' '}
                        <strong className="font-mono text-slate-800">{m.competencia}</strong>
                      </span>
                      <span>
                        Valor executado:{' '}
                        <strong className="font-mono text-emerald-700">
                          {formatCurrencyBR(m.valor)}
                        </strong>
                      </span>
                      {av && (
                        <>
                          {av.mediaAnterior !== null && (
                            <span>
                              MA:{' '}
                              <strong className="font-mono text-slate-800">
                                {formatNumberBR(av.mediaAnterior)}
                              </strong>
                            </span>
                          )}
                          <span>
                            NMA:{' '}
                            <strong className="font-mono text-[#004A8F]">
                              {formatNumberBR(av.nma)}
                            </strong>
                          </span>
                          <span>
                            MAA:{' '}
                            <strong className="font-mono text-emerald-700">
                              {formatNumberBR(av.maa)}
                            </strong>
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {av && (
                      <button
                        type="button"
                        onClick={() => setMedicaoParaExcluir(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
                        title="Excluir avaliação salva"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setMedicaoEditandoId(m.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>{av ? 'Editar Avaliação' : 'Preencher Avaliação'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={gerandoPdfId === m.id}
                      onClick={() => void handleGerarPdf(m, ctr)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>
                        {gerandoPdfId === m.id ? 'Gerando PDF...' : 'Gerar Avaliação (PDF)'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(medicaoParaExcluir)}
        destructive
        title="Excluir Avaliação de Desempenho"
        description={
          medicaoParaExcluir
            ? `Tem certeza que deseja excluir os dados da Avaliação de Desempenho nº ${medicaoParaExcluir.numero
                .toString()
                .padStart(2, '0')}?`
            : ''
        }
        confirmLabel="Excluir Avaliação"
        onCancel={() => setMedicaoParaExcluir(null)}
        onConfirm={async () => {
          if (medicaoParaExcluir) {
            await deleteAvaliacaoDesempenho(medicaoParaExcluir.id);
          }
          setMedicaoParaExcluir(null);
        }}
      />
    </div>
  );
}
