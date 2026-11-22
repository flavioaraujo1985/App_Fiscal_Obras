import { Edit, FileDown, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import AssinaturasPanel from '../../components/AssinaturasPanel';
import ConfirmDialog from '../../components/ConfirmDialog';
import NotaFiscalCard from '../../components/NotaFiscalCard';
import StatusTag from '../../components/StatusTag';
import { gerarPdfGefispag } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, ProcessoPagamentoGEFISPAG } from '../../types';
import { formatCurrencyBR, formatDateBR } from '../../utils/engineering';
import Certidoes from './Certidoes';
import ChecklistDocumental from './ChecklistDocumental';
import ParecerFiscalGefispag from './ParecerFiscal';
import ParecerGestorGefispag from './ParecerGestor';
import ValidacaoContratual from './ValidacaoContratual';
import WorkflowPagamento from './WorkflowPagamento';

export default function ProcessoPagamento({
  processo,
  contrato,
}: {
  processo: ProcessoPagamentoGEFISPAG;
  contrato: Contrato;
}) {
  const {
    db,
    updateProcessoGefispag,
    deleteProcessoGefispag,
    saveNotaFiscalGefispag,
    removeNotaFiscalGefispag,
    addAssinaturaEntidade,
    removeAssinaturaEntidade,
    pushToast,
  } = useFiscalStore();
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editNumeroProcesso, setEditNumeroProcesso] = useState('');
  const [editCompetencia, setEditCompetencia] = useState('');
  const [editDataAutuacao, setEditDataAutuacao] = useState('');
  const [editInss, setEditInss] = useState('');
  const [editIss, setEditIss] = useState('');
  const [editIrrf, setEditIrrf] = useState('');

  const medicao = db.medicoes.find((m) => m.id === processo.medicaoId);
  const nfAtual = processo.notaFiscalInfo ??
    medicao?.notaFiscal ?? {
      numero: processo.notaFiscal,
      dataEmissao: processo.dataAutuacao,
      valor: processo.valorBruto,
    };

  const openEditModal = () => {
    setEditNumeroProcesso(processo.numeroProcesso);
    setEditCompetencia(processo.competencia);
    setEditDataAutuacao(processo.dataAutuacao);
    setEditInss(String(processo.retencoes.inss));
    setEditIss(String(processo.retencoes.iss));
    setEditIrrf(String(processo.retencoes.irrf));
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNumeroProcesso.trim()) return;
    const inss = Math.max(0, Number(editInss) || 0);
    const iss = Math.max(0, Number(editIss) || 0);
    const irrf = Math.max(0, Number(editIrrf) || 0);
    const valorLiquido = Math.max(0, Number((processo.valorBruto - inss - iss - irrf).toFixed(2)));
    await updateProcessoGefispag(
      processo.id,
      {
        numeroProcesso: editNumeroProcesso.trim(),
        competencia: editCompetencia.trim(),
        dataAutuacao: editDataAutuacao,
        retencoes: {
          inss: Number(inss.toFixed(2)),
          iss: Number(iss.toFixed(2)),
          irrf: Number(irrf.toFixed(2)),
        },
        valorLiquido,
      },
      `Dados e retenções do processo ${editNumeroProcesso.trim()} atualizados.`
    );
    setEditOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Process Summary Header */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-xs font-mono font-semibold text-[#004A8F]">
              {processo.numeroProcesso} · NF {processo.notaFiscal || 'Sem NF'}
            </div>
            <h2 className="text-xl font-bold text-slate-900 mt-1">
              Contrato {contrato.numero} — {contrato.contratada}
            </h2>
            <div className="text-xs text-slate-500 mt-1 font-mono">
              Medição nº {medicao?.numero ?? '—'} · Competência {processo.competencia} · Autuado em{' '}
              {formatDateBR(processo.dataAutuacao)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusTag
              label={processo.statusWorkflow.replace('_', ' ')}
              tone={processo.statusWorkflow === 'PAGO' ? 'success' : 'info'}
            />
            <button
              type="button"
              onClick={openEditModal}
              className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Editar Processo</span>
            </button>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir</span>
            </button>
            <button
              type="button"
              disabled={gerandoPdf}
              onClick={async () => {
                setGerandoPdf(true);
                try {
                  await gerarPdfGefispag({
                    processo,
                    contrato,
                    medicao,
                    config: db.configuracoes,
                  });
                  pushToast('success', 'Processo GEFISPAG exportado em PDF e salvo no dispositivo.');
                } finally {
                  setGerandoPdf(false);
                }
              }}
              className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{gerandoPdf ? 'Gerando...' : 'Gerar PDF'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500">Valor Bruto</div>
            <div className="font-mono tabular-nums font-bold text-slate-900 mt-0.5">
              {formatCurrencyBR(processo.valorBruto)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Retenção INSS</div>
            <div className="font-mono tabular-nums text-slate-700 mt-0.5">
              -{formatCurrencyBR(processo.retencoes.inss)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Retenção ISS</div>
            <div className="font-mono tabular-nums text-slate-700 mt-0.5">
              -{formatCurrencyBR(processo.retencoes.iss)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">IRRF</div>
            <div className="font-mono tabular-nums text-slate-700 mt-0.5">
              -{formatCurrencyBR(processo.retencoes.irrf)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Valor Líquido a Pagar</div>
            <div className="font-mono tabular-nums font-bold text-emerald-700 mt-0.5">
              {formatCurrencyBR(processo.valorLiquido)}
            </div>
          </div>
        </div>
      </div>

      <NotaFiscalCard
        notaFiscal={nfAtual}
        valorSugerido={processo.valorBruto}
        contratada={contrato.contratada}
        onSave={(nf) => saveNotaFiscalGefispag(processo.id, nf)}
        onDelete={
          processo.notaFiscalInfo || processo.notaFiscal
            ? () => removeNotaFiscalGefispag(processo.id)
            : undefined
        }
      />

      <WorkflowPagamento processo={processo} contrato={contrato} />
      <ValidacaoContratual processo={processo} contrato={contrato} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChecklistDocumental processo={processo} />
        <Certidoes processo={processo} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ParecerFiscalGefispag processo={processo} />
        <ParecerGestorGefispag processo={processo} />
      </div>

      <AssinaturasPanel
        titulo="Campos de Assinatura Física do Processo GEFISPAG"
        documentoRef={`GEFISPAG-${processo.numeroProcesso}`}
        assinaturas={processo.assinaturas ?? []}
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
        onAdd={(sig) => addAssinaturaEntidade('GEFISPAG', processo.id, sig)}
        onRemove={(sigId) => removeAssinaturaEntidade('GEFISPAG', processo.id, sigId)}
      />

      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 no-print"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveEdit}
            className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                Editar Processo GEFISPAG
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nº do Processo *
                </label>
                <input
                  required
                  value={editNumeroProcesso}
                  onChange={(e) => setEditNumeroProcesso(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Competência *
                </label>
                <input
                  required
                  value={editCompetencia}
                  onChange={(e) => setEditCompetencia(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Data de Autuação *
                </label>
                <input
                  required
                  type="date"
                  value={editDataAutuacao}
                  onChange={(e) => setEditDataAutuacao(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Retenção INSS (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editInss}
                  onChange={(e) => setEditInss(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Retenção ISS (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editIss}
                  onChange={(e) => setEditIss(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Retenção IRRF (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editIrrf}
                  onChange={(e) => setEditIrrf(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-md p-3 flex items-center justify-between text-xs">
              <span className="text-slate-600">Valor Líquido Calculado:</span>
              <span className="font-mono font-bold text-emerald-700">
                {formatCurrencyBR(
                  Math.max(
                    0,
                    processo.valorBruto -
                      (Number(editInss) || 0) -
                      (Number(editIss) || 0) -
                      (Number(editIrrf) || 0)
                  )
                )}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={deleteOpen}
        destructive
        title="Excluir Processo GEFISPAG"
        description={`Deseja excluir o processo "${processo.numeroProcesso}"? A medição vinculada retornará ao status APROVADA.`}
        confirmLabel="Excluir Processo"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          setDeleteOpen(false);
          await deleteProcessoGefispag(processo.id);
        }}
      />
    </div>
  );
}
