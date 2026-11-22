import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { DiarioObra } from '../../types';

const EQUIPAMENTOS_LISTA = [
  'Retroescavadeira',
  'Escavadeira',
  'Rolo Compactador',
  'Betoneira',
  'Caminhão Basculante',
  'Munck',
  'Guindaste',
];

export default function EquipamentosSection({ diario }: { diario: DiarioObra }) {
  const { updateDiario, pushToast } = useFiscalStore();
  const [descricao, setDescricao] = useState(EQUIPAMENTOS_LISTA[0]);
  const [quantidade, setQuantidade] = useState('1');
  const [operacional, setOperacional] = useState(true);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eDesc, setEDesc] = useState('');
  const [eQtd, setEQtd] = useState('1');
  const [eOperacional, setEOperacional] = useState(true);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateDiario(diario.id, {
      equipamentos: [
        ...diario.equipamentos,
        {
          id: `eq-${Date.now()}`,
          descricao,
          quantidade: Number(quantidade) || 1,
          operacional,
        },
      ],
    });
  };

  const handleSaveEdit = async (id: string) => {
    await updateDiario(diario.id, {
      equipamentos: diario.equipamentos.map((eq) =>
        eq.id === id
          ? {
              ...eq,
              descricao: eDesc,
              quantidade: Math.max(1, Number(eQtd) || 1),
              operacional: eOperacional,
            }
          : eq
      ),
    });
    setEditingId(null);
    pushToast('success', 'Equipamento atualizado.');
  };

  const toggleOperacional = async (id: string) => {
    await updateDiario(diario.id, {
      equipamentos: diario.equipamentos.map((eq) =>
        eq.id === id ? { ...eq, operacional: !eq.operacional } : eq
      ),
    });
  };

  const handleRemove = async (id: string) => {
    await updateDiario(diario.id, {
      equipamentos: diario.equipamentos.filter((eq) => eq.id !== id),
    });
    pushToast('info', 'Equipamento removido.');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h3 className="text-base font-semibold text-slate-900">Equipamentos & Máquinas</h3>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs text-slate-500 mb-1">Equipamento</label>
          <select
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
          >
            {EQUIPAMENTOS_LISTA.map((eq) => (
              <option key={eq} value={eq}>
                {eq}
              </option>
            ))}
          </select>
        </div>
        <div className="w-24">
          <label className="block text-xs text-slate-500 mb-1">Qtd</label>
          <input
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
          />
        </div>
        <label className="flex items-center gap-2 py-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={operacional}
            onChange={(e) => setOperacional(e.target.checked)}
            className="accent-[#004A8F]"
          />
          <span>Operacional</span>
        </label>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
        >
          <Plus className="w-4 h-4" />
          <span>Incluir</span>
        </button>
      </form>

      <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
        {diario.equipamentos.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 text-center">
            Nenhum equipamento registrado neste RDO.
          </div>
        ) : (
          diario.equipamentos.map((eq) => {
            const isEditing = editingId === eq.id;
            return (
              <div key={eq.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                {isEditing ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <select
                      value={eDesc}
                      onChange={(e) => setEDesc(e.target.value)}
                      className="flex-1 min-w-[160px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded"
                    >
                      {!EQUIPAMENTOS_LISTA.includes(eDesc) && (
                        <option value={eDesc}>{eDesc}</option>
                      )}
                      {EQUIPAMENTOS_LISTA.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      value={eQtd}
                      onChange={(e) => setEQtd(e.target.value)}
                      className="w-20 px-2.5 py-1 text-xs font-mono border border-slate-300 rounded"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={eOperacional}
                        onChange={(e) => setEOperacional(e.target.checked)}
                        className="accent-[#004A8F]"
                      />
                      <span>Operacional</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => void handleSaveEdit(eq.id)}
                      className="p-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                      aria-label="Salvar equipamento"
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
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-slate-900">{eq.descricao}</span>
                      <span className="font-mono text-xs text-slate-500">× {eq.quantidade}</span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <button type="button" onClick={() => toggleOperacional(eq.id)}>
                        <StatusTag
                          label={eq.operacional ? 'Operacional' : 'Em Manutenção'}
                          tone={eq.operacional ? 'success' : 'warning'}
                        />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(eq.id);
                          setEDesc(eq.descricao);
                          setEQtd(String(eq.quantidade));
                          setEOperacional(eq.operacional);
                        }}
                        className="text-slate-400 hover:text-[#004A8F]"
                        aria-label="Editar equipamento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(eq.id)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Remover equipamento"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
