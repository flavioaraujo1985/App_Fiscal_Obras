import { Calculator, Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Medicao, MemoriaCalculo as MemoriaCalculoType } from '../../types';
import { formatNumberBR, formulas } from '../../utils/engineering';

type TipoFormula = 'AREA' | 'VOLUME' | 'COMPRIMENTO';

export default function MemoriaCalculo({ medicao }: { medicao: Medicao }) {
  const { updateMedicao, pushToast } = useFiscalStore();
  const [descricao, setDescricao] = useState('');
  const [local, setLocal] = useState('');
  const [tipoFormula, setTipoFormula] = useState<TipoFormula>('AREA');
  const [dimA, setDimA] = useState('10');
  const [dimB, setDimB] = useState('3');
  const [dimC, setDimC] = useState('0.20');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eDesc, setEDesc] = useState('');
  const [eLocal, setELocal] = useState('');
  const [eFormula, setEFormula] = useState('');
  const [eValor, setEValor] = useState('');
  const [eUnidade, setEUnidade] = useState('');
  const [memToDelete, setMemToDelete] = useState<MemoriaCalculoType | null>(null);

  const a = Number(dimA) || 0;
  const b = Number(dimB) || 0;
  const c = Number(dimC) || 0;

  const resultadoCalculado =
    tipoFormula === 'AREA'
      ? formulas.area(a, b)
      : tipoFormula === 'VOLUME'
      ? formulas.volume(a, b, c)
      : formulas.comprimento(a, b);

  const unidadeCalculada =
    tipoFormula === 'AREA' ? 'm²' : tipoFormula === 'VOLUME' ? 'm³' : 'm';

  const formulaString =
    tipoFormula === 'AREA'
      ? `${formatNumberBR(a)} m × ${formatNumberBR(b)} m`
      : tipoFormula === 'VOLUME'
      ? `${formatNumberBR(a)} m × ${formatNumberBR(b)} m × ${formatNumberBR(c)} m`
      : `${formatNumberBR(a)} m + ${formatNumberBR(b)} m`;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim() || !local.trim()) return;
    const nova = {
      id: `mc-${Date.now()}`,
      medicaoId: medicao.id,
      descricao: descricao.trim(),
      formula: formulaString,
      valor: resultadoCalculado,
      unidade: unidadeCalculada,
      local: local.trim(),
      fotoIds: [],
    };
    await updateMedicao(medicao.id, {
      memoriasCalculo: [...medicao.memoriasCalculo, nova],
    });
    pushToast('success', 'Memória de cálculo adicionada.');
    setDescricao('');
    setLocal('');
  };

  const startEdit = (mc: MemoriaCalculoType) => {
    setEditingId(mc.id);
    setEDesc(mc.descricao);
    setELocal(mc.local);
    setEFormula(mc.formula);
    setEValor(String(mc.valor));
    setEUnidade(mc.unidade);
  };

  const saveEdit = async (id: string) => {
    if (!eDesc.trim() || !eLocal.trim()) return;
    await updateMedicao(medicao.id, {
      memoriasCalculo: medicao.memoriasCalculo.map((m) =>
        m.id === id
          ? {
              ...m,
              descricao: eDesc.trim(),
              local: eLocal.trim(),
              formula: eFormula.trim() || m.formula,
              valor: Number(eValor) || 0,
              unidade: eUnidade.trim() || m.unidade,
            }
          : m
      ),
    });
    setEditingId(null);
    pushToast('success', 'Memória de cálculo atualizada.');
  };

  const handleRemove = async (id: string) => {
    await updateMedicao(medicao.id, {
      memoriasCalculo: medicao.memoriasCalculo.filter((m) => m.id !== id),
    });
    pushToast('info', 'Memória de cálculo removida.');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Calculator className="w-4 h-4 text-[#004A8F]" />
          <span>Calculadora de Memória de Cálculo</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Descrição do Serviço</label>
            <input
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Alvenaria Bloco A"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Local / Frente</label>
            <input
              required
              value={local}
              onChange={(e) => setLocal(e.target.value)}
              placeholder="Ex: Bloco A — Térreo"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fórmula Geométrica</label>
            <select
              value={tipoFormula}
              onChange={(e) => setTipoFormula(e.target.value as TipoFormula)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
            >
              <option value="AREA">Área (Comprimento × Altura)</option>
              <option value="VOLUME">Volume (C × L × H)</option>
              <option value="COMPRIMENTO">Comprimento (Trecho A + Trecho B)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {tipoFormula === 'COMPRIMENTO' ? 'Trecho A (m)' : 'Comprimento (m)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={dimA}
              onChange={(e) => setDimA(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              {tipoFormula === 'AREA'
                ? 'Altura (m)'
                : tipoFormula === 'VOLUME'
                ? 'Largura (m)'
                : 'Trecho B (m)'}
            </label>
            <input
              type="number"
              step="0.01"
              value={dimB}
              onChange={(e) => setDimB(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          {tipoFormula === 'VOLUME' ? (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Altura/Esp. (m)</label>
              <input
                type="number"
                step="0.01"
                value={dimC}
                onChange={(e) => setDimC(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
          ) : (
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-md">
              <div className="text-[11px] text-slate-500">Resultado</div>
              <div className="font-mono font-bold text-sm text-[#004A8F]">
                {formatNumberBR(resultadoCalculado)} {unidadeCalculada}
              </div>
            </div>
          )}

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Memória</span>
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {medicao.memoriasCalculo.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhuma memória de cálculo registrada para esta medição.
          </div>
        ) : (
          medicao.memoriasCalculo.map((mc) => {
            const isEditing = editingId === mc.id;
            return (
              <div key={mc.id} className="p-4">
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end">
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
                      <label className="block text-[11px] text-slate-500 mb-1">Fórmula</label>
                      <input
                        value={eFormula}
                        onChange={(e) => setEFormula(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      <div className="flex-1">
                        <label className="block text-[11px] text-slate-500 mb-1">Valor</label>
                        <input
                          type="number"
                          step="0.01"
                          value={eValor}
                          onChange={(e) => setEValor(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs font-mono border border-slate-300 rounded"
                        />
                      </div>
                      <div className="w-16">
                        <label className="block text-[11px] text-slate-500 mb-1">Unid.</label>
                        <input
                          value={eUnidade}
                          onChange={(e) => setEUnidade(e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void saveEdit(mc.id)}
                        className="p-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                        aria-label="Salvar memória"
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
                      <div className="text-sm font-semibold text-slate-900">{mc.descricao}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {mc.local} · Fórmula: <span className="font-mono">{mc.formula}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono tabular-nums text-sm font-bold text-[#004A8F] mr-2">
                        {formatNumberBR(mc.valor)} {mc.unidade}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(mc)}
                        className="p-1.5 text-slate-400 hover:text-[#004A8F] rounded"
                        aria-label="Editar memória"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setMemToDelete(mc)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        aria-label="Remover memória"
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

      <ConfirmDialog
        open={Boolean(memToDelete)}
        destructive
        title="Excluir Memória de Cálculo"
        description={
          memToDelete
            ? `Tem certeza que deseja excluir a memória de cálculo "${memToDelete.descricao}"?`
            : ''
        }
        confirmLabel="Excluir Memória"
        onCancel={() => setMemToDelete(null)}
        onConfirm={async () => {
          if (memToDelete) {
            await handleRemove(memToDelete.id);
          }
          setMemToDelete(null);
        }}
      />
    </div>
  );
}
