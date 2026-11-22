import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { DiarioObra } from '../../types';

const FUNCOES = [
  'Pedreiro',
  'Servente',
  'Carpinteiro',
  'Armador',
  'Eletricista',
  'Encanador',
  'Operador',
  'Topógrafo',
  'Engenheiro',
];

export default function EfetivoSection({ diario }: { diario: DiarioObra }) {
  const { updateDiario, pushToast } = useFiscalStore();
  const [categoria, setCategoria] = useState(FUNCOES[0]);
  const [quantidade, setQuantidade] = useState('4');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eCategoria, setECategoria] = useState('');
  const [eQtd, setEQtd] = useState('1');

  const total = diario.efetivo.reduce((acc, e) => acc + e.quantidade, 0);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtd = Number(quantidade) || 0;
    if (qtd <= 0) return;
    await updateDiario(diario.id, {
      efetivo: [...diario.efetivo, { id: `ef-${Date.now()}`, categoria, quantidade: qtd }],
    });
  };

  const handleSaveEdit = async (id: string) => {
    const qtd = Math.max(1, Number(eQtd) || 1);
    await updateDiario(diario.id, {
      efetivo: diario.efetivo.map((item) =>
        item.id === id ? { ...item, categoria: eCategoria, quantidade: qtd } : item
      ),
    });
    setEditingId(null);
    pushToast('success', 'Efetivo atualizado.');
  };

  const handleRemove = async (id: string) => {
    await updateDiario(diario.id, {
      efetivo: diario.efetivo.filter((e) => e.id !== id),
    });
    pushToast('info', 'Efetivo removido.');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">
          Efetivo de Mão de Obra
        </h3>
        <span className="font-mono text-sm font-semibold text-[#004A8F]">
          Total: {total} trabalhadores
        </span>
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs text-slate-500 mb-1">Função</label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
          >
            {FUNCOES.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <div className="w-28">
          <label className="block text-xs text-slate-500 mb-1">Qtd</label>
          <input
            type="number"
            min={1}
            value={quantidade}
            onChange={(e) => setQuantidade(e.target.value)}
            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
        >
          <Plus className="w-4 h-4" />
          <span>Adicionar</span>
        </button>
      </form>

      <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
        {diario.efetivo.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 text-center">
            Nenhum efetivo alocado neste RDO.
          </div>
        ) : (
          diario.efetivo.map((item) => {
            const isEditing = editingId === item.id;
            return (
              <div key={item.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm">
                {isEditing ? (
                  <div className="flex flex-1 flex-wrap items-center gap-2">
                    <select
                      value={eCategoria}
                      onChange={(e) => setECategoria(e.target.value)}
                      className="flex-1 min-w-[140px] px-2.5 py-1 text-xs bg-white border border-slate-300 rounded"
                    >
                      {!FUNCOES.includes(eCategoria) && (
                        <option value={eCategoria}>{eCategoria}</option>
                      )}
                      {FUNCOES.map((f) => (
                        <option key={f} value={f}>
                          {f}
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
                    <button
                      type="button"
                      onClick={() => void handleSaveEdit(item.id)}
                      className="p-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                      aria-label="Salvar função"
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
                    <span className="font-medium text-slate-900">{item.categoria}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-mono tabular-nums font-semibold text-slate-700 mr-1">
                        {item.quantidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(item.id);
                          setECategoria(item.categoria);
                          setEQtd(String(item.quantidade));
                        }}
                        className="text-slate-400 hover:text-[#004A8F]"
                        aria-label="Editar função"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="text-slate-400 hover:text-red-600"
                        aria-label="Remover função"
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
