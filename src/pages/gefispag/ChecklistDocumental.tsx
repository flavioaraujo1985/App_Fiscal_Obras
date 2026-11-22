import { Check, CheckSquare, Edit, Plus, Square, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { ItemChecklistGEFISPAG, ProcessoPagamentoGEFISPAG } from '../../types';

export default function ChecklistDocumental({
  processo,
}: {
  processo: ProcessoPagamentoGEFISPAG;
}) {
  const { updateProcessoGefispag } = useFiscalStore();
  const [newLabel, setNewLabel] = useState('');
  const [newObs, setNewObs] = useState('');
  const [newObrigatorio, setNewObrigatorio] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editObs, setEditObs] = useState('');
  const [editObrigatorio, setEditObrigatorio] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<ItemChecklistGEFISPAG | null>(null);

  const toggleItem = async (itemId: string) => {
    const checklistDocumental = processo.checklistDocumental.map((i) =>
      i.id === itemId ? { ...i, conferido: !i.conferido } : i
    );
    await updateProcessoGefispag(processo.id, { checklistDocumental });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    const novo: ItemChecklistGEFISPAG = {
      id: `chk-${Date.now()}`,
      label: newLabel.trim(),
      obrigatorio: newObrigatorio,
      conferido: false,
      observacao: newObs.trim() || undefined,
    };
    await updateProcessoGefispag(processo.id, {
      checklistDocumental: [...processo.checklistDocumental, novo],
    });
    setNewLabel('');
    setNewObs('');
    setNewObrigatorio(true);
  };

  const startEdit = (item: ItemChecklistGEFISPAG) => {
    setEditingId(item.id);
    setEditLabel(item.label);
    setEditObs(item.observacao ?? '');
    setEditObrigatorio(item.obrigatorio);
  };

  const handleSaveEdit = async (itemId: string) => {
    if (!editLabel.trim()) return;
    const checklistDocumental = processo.checklistDocumental.map((i) =>
      i.id === itemId
        ? {
            ...i,
            label: editLabel.trim(),
            obrigatorio: editObrigatorio,
            observacao: editObs.trim() || undefined,
          }
        : i
    );
    await updateProcessoGefispag(processo.id, { checklistDocumental });
    setEditingId(null);
  };

  const handleDelete = async (itemId: string) => {
    const checklistDocumental = processo.checklistDocumental.filter((i) => i.id !== itemId);
    await updateProcessoGefispag(processo.id, { checklistDocumental });
  };

  const total = processo.checklistDocumental.length;
  const concluidos = processo.checklistDocumental.filter((i) => i.conferido).length;

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">Checklist Documental</h3>
        <span className="font-mono text-xs font-semibold text-[#004A8F]">
          {concluidos}/{total} conferidos
        </span>
      </div>

      <div className="divide-y divide-slate-100">
        {processo.checklistDocumental.map((item) => {
          const isEditing = editingId === item.id;
          if (isEditing) {
            return (
              <div key={item.id} className="py-2.5 px-2 bg-slate-50 rounded space-y-2">
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  placeholder="Descrição do documento *"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                />
                <input
                  value={editObs}
                  onChange={(e) => setEditObs(e.target.value)}
                  placeholder="Observação (opcional)"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editObrigatorio}
                      onChange={(e) => setEditObrigatorio(e.target.checked)}
                    />
                    <span>Item obrigatório</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-700 bg-white border border-slate-300 rounded"
                    >
                      <X className="w-3 h-3" />
                      <span>Cancelar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveEdit(item.id)}
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs text-white bg-[#004A8F] rounded"
                    >
                      <Check className="w-3 h-3" />
                      <span>Salvar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div
              key={item.id}
              className="py-2.5 px-1 flex items-start justify-between gap-3 hover:bg-slate-50 rounded"
            >
              <button
                type="button"
                onClick={() => void toggleItem(item.id)}
                className="flex items-start gap-2.5 text-left flex-1 min-w-0"
              >
                {item.conferido ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0">
                  <div className="text-sm text-slate-900">
                    {item.label}
                    {item.obrigatorio && (
                      <span className="ml-1.5 text-[10px] font-mono text-slate-400">
                        (Obrig.)
                      </span>
                    )}
                  </div>
                  {item.observacao && (
                    <div className="text-xs text-amber-700 mt-0.5">{item.observacao}</div>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-1 shrink-0 no-print">
                <button
                  type="button"
                  onClick={() => startEdit(item)}
                  className="p-1 text-slate-400 hover:text-[#004A8F] hover:bg-slate-100 rounded"
                  title="Editar item"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(item)}
                  className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded"
                  title="Excluir item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-6 gap-2 pt-2 border-t border-slate-100 no-print">
        <input
          required
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Novo item documental *"
          className="sm:col-span-3 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
        />
        <input
          value={newObs}
          onChange={(e) => setNewObs(e.target.value)}
          placeholder="Observação"
          className="sm:col-span-2 px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Adicionar</span>
        </button>
        <label className="sm:col-span-6 inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={newObrigatorio}
            onChange={(e) => setNewObrigatorio(e.target.checked)}
          />
          <span>Marcar como item obrigatório</span>
        </label>
      </form>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        destructive
        title="Excluir Item do Checklist"
        description={`Deseja remover o item "${confirmDelete?.label}" do checklist documental?`}
        confirmLabel="Excluir"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          const id = confirmDelete.id;
          setConfirmDelete(null);
          await handleDelete(id);
        }}
      />
    </div>
  );
}
