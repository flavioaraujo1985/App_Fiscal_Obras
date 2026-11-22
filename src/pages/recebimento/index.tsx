import { CheckCircle2, Edit, FileCheck2, FileDown, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import AssinaturasPanel from '../../components/AssinaturasPanel';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatusTag from '../../components/StatusTag';
import { gerarPdfTermoRecebimento } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { TermoRecebimento } from '../../types';
import { formatDateBR, podePagar } from '../../utils/engineering';

export default function RecebimentoPage() {
  const {
    db,
    selectedContratoId,
    addRecebimento,
    updateRecebimento,
    deleteRecebimento,
    updateRecebimentoStatus,
    addAssinaturaEntidade,
    removeAssinaturaEntidade,
    pushToast,
  } = useFiscalStore();

  const [contratoId, setContratoId] = useState(
    selectedContratoId !== 'ALL' ? selectedContratoId : db.contratos[0]?.id ?? ''
  );
  const [tipo, setTipo] = useState<'PROVISORIO' | 'DEFINITIVO'>('PROVISORIO');
  const [representante, setRepresentante] = useState('Eng. Responsável Técnico da Contratada');
  const [observacoes, setObservacoes] = useState(
    'Obra vistoriada e recebida em conformidade com o projeto executivo e especificações técnicas.'
  );

  const [editingTermo, setEditingTermo] = useState<TermoRecebimento | null>(null);
  const [editTipo, setEditTipo] = useState<'PROVISORIO' | 'DEFINITIVO'>('PROVISORIO');
  const [editNumero, setEditNumero] = useState('');
  const [editDataEmissao, setEditDataEmissao] = useState('');
  const [editFiscal, setEditFiscal] = useState('');
  const [editGestor, setEditGestor] = useState('');
  const [editRepresentante, setEditRepresentante] = useState('');
  const [editObservacoes, setEditObservacoes] = useState('');
  const [editStatus, setEditStatus] = useState<TermoRecebimento['status']>('EMITIDO');
  const [confirmDelete, setConfirmDelete] = useState<TermoRecebimento | null>(null);

  const recebimentos = db.recebimentos.filter(
    (r) => selectedContratoId === 'ALL' || r.contratoId === selectedContratoId
  );

  const ncsContrato = db.naoConformidades.filter((nc) => nc.contratoId === contratoId);
  const semPendenciasNC = podePagar(ncsContrato);

  const handleEmitir = async (e: React.FormEvent) => {
    e.preventDefault();
    const contrato = db.contratos.find((c) => c.id === contratoId);
    if (!contrato) return;
    if (!semPendenciasNC && tipo === 'DEFINITIVO') {
      pushToast(
        'error',
        'Não é possível emitir Termo Definitivo com Não Conformidades abertas.'
      );
      return;
    }

    const prefix = tipo === 'PROVISORIO' ? 'TRP' : 'TRD';
    const seq = (db.recebimentos.length + 8).toString().padStart(3, '0');
    await addRecebimento({
      contratoId,
      tipo,
      numero: `${prefix}-2026/${seq}`,
      dataEmissao: new Date().toISOString().slice(0, 10),
      fiscalResponsavel: contrato.fiscal,
      gestorResponsavel: contrato.gestor,
      representanteContratada: representante.trim(),
      observacoes: observacoes.trim(),
      status: 'EMITIDO',
    });
  };

  const openEdit = (rec: TermoRecebimento) => {
    setEditingTermo(rec);
    setEditTipo(rec.tipo);
    setEditNumero(rec.numero);
    setEditDataEmissao(rec.dataEmissao);
    setEditFiscal(rec.fiscalResponsavel);
    setEditGestor(rec.gestorResponsavel);
    setEditRepresentante(rec.representanteContratada);
    setEditObservacoes(rec.observacoes);
    setEditStatus(rec.status);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTermo || !editNumero.trim()) return;
    await updateRecebimento(editingTermo.id, {
      tipo: editTipo,
      numero: editNumero.trim(),
      dataEmissao: editDataEmissao,
      fiscalResponsavel: editFiscal.trim(),
      gestorResponsavel: editGestor.trim(),
      representanteContratada: editRepresentante.trim(),
      observacoes: editObservacoes.trim(),
      status: editStatus,
    });
    setEditingTermo(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Recebimento Provisório e Definitivo
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Emissão de termos de recebimento de obra conforme Art. 140 da Lei nº 14.133/2021.
        </p>
      </div>

      <form onSubmit={handleEmitir} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 no-print">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Emitir Termo de Recebimento</h2>
          <span
            className={`text-xs font-medium ${
              semPendenciasNC ? 'text-emerald-700' : 'text-amber-700'
            }`}
          >
            {semPendenciasNC
              ? 'Sem NCs bloqueantes para este contrato'
              : 'Existem NCs pendentes neste contrato'}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Contrato</label>
            <select
              value={contratoId}
              onChange={(e) => setContratoId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
            >
              {db.contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} — {c.contratada}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo de Termo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as 'PROVISORIO' | 'DEFINITIVO')}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
            >
              <option value="PROVISORIO">Termo de Recebimento Provisório</option>
              <option value="DEFINITIVO">Termo de Recebimento Definitivo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Representante da Contratada</label>
            <input
              required
              value={representante}
              onChange={(e) => setRepresentante(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Parecer & Observações</label>
          <textarea
            rows={2}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            <Plus className="w-4 h-4" />
            <span>Emitir Termo</span>
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {recebimentos.map((rec) => {
          const ctr = db.contratos.find((c) => c.id === rec.contratoId);
          return (
            <div key={rec.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#004A8F]" />
                    <span className="font-mono font-bold text-slate-900">{rec.numero}</span>
                    <StatusTag
                      label={rec.tipo === 'PROVISORIO' ? 'Provisório' : 'Definitivo'}
                      tone={rec.tipo === 'DEFINITIVO' ? 'success' : 'info'}
                    />
                    <StatusTag
                      label={rec.status}
                      tone={rec.status === 'ASSINADO' ? 'success' : 'warning'}
                    />
                  </div>
                  <div className="text-sm font-medium text-slate-800 mt-1">
                    Contrato {ctr?.numero} — {ctr?.contratada}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Emitido em {formatDateBR(rec.dataEmissao)} · Fiscal: {rec.fiscalResponsavel} ·
                    Gestor: {rec.gestorResponsavel}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 no-print">
                  <button
                    type="button"
                    onClick={() => openEdit(rec)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Editar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(rec)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Excluir</span>
                  </button>
                  {rec.status !== 'ASSINADO' && (
                    <button
                      type="button"
                      onClick={() => updateRecebimentoStatus(rec.id, 'ASSINADO')}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Assinar Termo</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={async () => {
                      if (!ctr) return;
                      await gerarPdfTermoRecebimento({
                        termo: rec,
                        contrato: ctr,
                        config: db.configuracoes,
                      });
                      pushToast('success', 'Termo de Recebimento exportado em PDF e salvo no dispositivo.');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] whitespace-nowrap shrink-0"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    <span>Baixar PDF</span>
                  </button>
                </div>
              </div>

              <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded p-3">
                {rec.observacoes}
              </p>

              <AssinaturasPanel
                titulo={`Campos de Assinatura Física — ${rec.numero}`}
                documentoRef={`TERMO-${rec.numero}`}
                assinaturas={rec.assinaturas ?? []}
                presets={[
                  {
                    label: 'Fiscal',
                    nome: rec.fiscalResponsavel,
                    cargo: 'Fiscal do Contrato',
                    registro: db.configuracoes.creaFiscal,
                  },
                  {
                    label: 'Gestor',
                    nome: rec.gestorResponsavel,
                    cargo: 'Gestor do Contrato',
                  },
                  {
                    label: 'Contratada',
                    nome: rec.representanteContratada,
                    cargo: 'Representante da Contratada',
                  },
                ]}
                onAdd={(sig) => addAssinaturaEntidade('RECEBIMENTO', rec.id, sig)}
                onRemove={(sigId) => removeAssinaturaEntidade('RECEBIMENTO', rec.id, sigId)}
              />
            </div>
          );
        })}
      </div>

      {editingTermo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 no-print"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveEdit}
            className="bg-white border border-slate-200 rounded-lg max-w-xl w-full p-6 shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                Editar Termo de Recebimento
              </h3>
              <button
                type="button"
                onClick={() => setEditingTermo(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                <select
                  value={editTipo}
                  onChange={(e) => setEditTipo(e.target.value as 'PROVISORIO' | 'DEFINITIVO')}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                >
                  <option value="PROVISORIO">Provisório</option>
                  <option value="DEFINITIVO">Definitivo</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Número *</label>
                <input
                  required
                  value={editNumero}
                  onChange={(e) => setEditNumero(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Data de Emissão *
                </label>
                <input
                  required
                  type="date"
                  value={editDataEmissao}
                  onChange={(e) => setEditDataEmissao(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as TermoRecebimento['status'])}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                >
                  <option value="RASCUNHO">RASCUNHO</option>
                  <option value="EMITIDO">EMITIDO</option>
                  <option value="ASSINADO">ASSINADO</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Fiscal Responsável *
                </label>
                <input
                  required
                  value={editFiscal}
                  onChange={(e) => setEditFiscal(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Gestor Responsável *
                </label>
                <input
                  required
                  value={editGestor}
                  onChange={(e) => setEditGestor(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Representante da Contratada *
              </label>
              <input
                required
                value={editRepresentante}
                onChange={(e) => setEditRepresentante(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Parecer & Observações *
              </label>
              <textarea
                required
                rows={3}
                value={editObservacoes}
                onChange={(e) => setEditObservacoes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditingTermo(null)}
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
        open={Boolean(confirmDelete)}
        destructive
        title="Excluir Termo de Recebimento"
        description={`Deseja excluir permanentemente o termo "${confirmDelete?.numero}"?`}
        confirmLabel="Excluir Termo"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          const id = confirmDelete.id;
          setConfirmDelete(null);
          await deleteRecebimento(id);
        }}
      />
    </div>
  );
}
