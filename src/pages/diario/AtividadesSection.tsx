import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { AtividadeDiario, DiarioObra } from '../../types';

export default function AtividadesSection({ diario }: { diario: DiarioObra }) {
  const { db, updateDiario, pushToast } = useFiscalStore();
  const [descricao, setDescricao] = useState('');
  const [local, setLocal] = useState('');
  const [codigoItem, setCodigoItem] = useState('');
  const [percentual, setPercentual] = useState('50');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eDesc, setEDesc] = useState('');
  const [eLocal, setELocal] = useState('');
  const [eCodigo, setECodigo] = useState('');
  const [ePerc, setEPerc] = useState('0');

  const itensPlanilha = db.itensContrato.filter((i) => i.contratoId === diario.contratoId);

  const handleSelectPlanilhaItem = (itemId: string) => {
    const ic = itensPlanilha.find((i) => i.id === itemId);
    if (!ic) return;
    setCodigoItem(ic.codigo);
    setDescricao(ic.descricao);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !local.trim()) return;
    await updateDiario(diario.id, {
      atividades: [
        ...diario.atividades,
        {
          id: `at-${Date.now()}`,
          descricao: descricao.trim(),
          local: local.trim(),
          codigoItem: codigoItem.trim() || undefined,
          percentual: Math.max(0, Math.min(100, Number(percentual) || 0)),
        },
      ],
    });
    setDescricao('');
    setLocal('');
    setCodigoItem('');
  };

  const startEdit = (at: AtividadeDiario) => {
    setEditingId(at.id);
    setEDesc(at.descricao);
    setELocal(at.local);
    setECodigo(at.codigoItem ?? '');
    setEPerc(String(at.percentual));
  };

  const saveEdit = async (id: string) => {
    if (!eDesc.trim() || !eLocal.trim()) return;
    await updateDiario(diario.id, {
      atividades: diario.atividades.map((at) =>
        at.id === id
          ? {
              ...at,
              descricao: eDesc.trim(),
              local: eLocal.trim(),
              codigoItem: eCodigo.trim() || undefined,
              percentual: Math.max(0, Math.min(100, Number(ePerc) || 0)),
            }
          : at
      ),
    });
    setEditingId(null);
    pushToast('success', 'Atividade atualizada.');
  };

  const handleRemove = async (id: string) => {
    await updateDiario(diario.id, {
      atividades: diario.atividades.filter((a) => a.id !== id),
    });
    pushToast('info', 'Atividade removida.');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">
          Atividades Executadas ({diario.atividades.length})
        </h3>
        <span className="text-xs text-slate-500">Obrigatório para fechamento do RDO</span>
      </div>

      {itensPlanilha.length > 0 && (
        <div>
          <label className="block text-xs text-slate-500 mb-1">
            Puxar serviço do Banco da Planilha ({itensPlanilha.length} itens)
          </label>
          <select
            defaultValue=""
            onChange={(e) => {
              if (e.target.value) handleSelectPlanilhaItem(e.target.value);
            }}
            className="w-full sm:w-1/2 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md"
          >
            <option value="">Selecionar item da planilha importada (opcional)...</option>
            {itensPlanilha.map((ic) => (
              <option key={ic.id} value={ic.id}>
                {ic.codigo} — {ic.descricao} ({ic.unidade})
              </option>
            ))}
          </select>
        </div>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Descrição da Atividade</label>
          <input
            required
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Execução de alvenaria cerâmica"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Local</label>
          <input
            required
            value={local}
            onChange={(e) => setLocal(e.target.value)}
            placeholder="Ex: Bloco A"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Código Planilha</label>
          <input
            value={codigoItem}
            onChange={(e) => setCodigoItem(e.target.value)}
            placeholder="01.03.004"
            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">% Concluído</label>
          <input
            type="number"
            min={0}
            max={100}
            value={percentual}
            onChange={(e) => setPercentual(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar</span>
        </button>
      </form>

      <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
        {diario.atividades.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 text-center">
            Nenhuma atividade registrada neste RDO.
          </div>
        ) : (
          diario.atividades.map((at) => {
            const isEditing = editingId === at.id;
            return (
              <div key={at.id} className="p-3.5">
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] text-slate-500 mb-1">Descrição</label>
                      <input
                        value={eDesc}
                        onChange={(e) => setEDesc(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Local</label>
                      <input
                        value={eLocal}
                        onChange={(e) => setELocal(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">Código</label>
                      <input
                        value={eCodigo}
                        onChange={(e) => setECodigo(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-500 mb-1">% Concl.</label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={ePerc}
                        onChange={(e) => setEPerc(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void saveEdit(at.id)}
                        className="p-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                        aria-label="Salvar atividade"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-500 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"
                        aria-label="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{at.descricao}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {at.local}
                        {at.codigoItem ? ` · Item ${at.codigoItem}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono tabular-nums text-sm font-semibold text-[#004A8F] mr-1">
                        {at.percentual}%
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(at)}
                        className="text-slate-400 hover:text-[#004A8F]"
                        aria-label="Editar atividade"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(at.id)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Remover atividade"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
