import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, Garantia, TipoGarantia } from '../../types';
import { calcularDiasRestantes, formatCurrencyBR, formatDateBR, vigenciaColor } from '../../utils/engineering';

export default function GarantiasTab({ contrato }: { contrato: Contrato }) {
  const { db, addGarantia, updateGarantia, deleteGarantia } = useFiscalStore();
  const garantias = db.garantias.filter((g) => g.contratoId === contrato.id);

  const [tipo, setTipo] = useState<TipoGarantia>('SEGURO');
  const [seguradora, setSeguradora] = useState('');
  const [apolice, setApolice] = useState('');
  const [valor, setValor] = useState(String(Math.round(contrato.valorAtual * 0.05)));
  const [inicio, setInicio] = useState('2026-11-21');
  const [fim, setFim] = useState('2027-11-21');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eTipo, setETipo] = useState<TipoGarantia>('SEGURO');
  const [eSeguradora, setESeguradora] = useState('');
  const [eApolice, setEApolice] = useState('');
  const [eValor, setEValor] = useState('0');
  const [eInicio, setEInicio] = useState('');
  const [eFim, setEFim] = useState('');
  const [garantiaToDelete, setGarantiaToDelete] = useState<Garantia | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seguradora.trim() || !apolice.trim()) return;
    await addGarantia({
      contratoId: contrato.id,
      tipo,
      seguradora: seguradora.trim(),
      apolice: apolice.trim(),
      valor: Number(valor) || 0,
      inicio,
      fim,
    });
    setSeguradora('');
    setApolice('');
  };

  const startEdit = (g: Garantia) => {
    setEditingId(g.id);
    setETipo(g.tipo);
    setESeguradora(g.seguradora);
    setEApolice(g.apolice);
    setEValor(String(g.valor));
    setEInicio(g.inicio);
    setEFim(g.fim);
  };

  const saveEdit = async (id: string) => {
    if (!eSeguradora.trim() || !eApolice.trim()) return;
    await updateGarantia(id, {
      tipo: eTipo,
      seguradora: eSeguradora.trim(),
      apolice: eApolice.trim(),
      valor: Number(eValor) || 0,
      inicio: eInicio,
      fim: eFim,
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {garantias.map((g) => {
          const dias = calcularDiasRestantes(g.fim);
          const cor = vigenciaColor(dias);
          const tone = cor === 'error' ? 'error' : cor === 'warning' ? 'warning' : 'success';
          const isEditing = editingId === g.id;
          return (
            <div key={g.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
              {isEditing ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={eTipo}
                      onChange={(e) => setETipo(e.target.value as TipoGarantia)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    >
                      <option value="SEGURO">Seguro Garantia</option>
                      <option value="FIANCA">Fiança Bancária</option>
                      <option value="CAUCAO">Caução</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      value={eValor}
                      onChange={(e) => setEValor(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      value={eSeguradora}
                      onChange={(e) => setESeguradora(e.target.value)}
                      placeholder="Seguradora / Banco"
                      className="px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                    />
                    <input
                      value={eApolice}
                      onChange={(e) => setEApolice(e.target.value)}
                      placeholder="Nº Apólice"
                      className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={eInicio}
                      onChange={(e) => setEInicio(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                    />
                    <input
                      type="date"
                      value={eFim}
                      onChange={(e) => setEFim(e.target.value)}
                      className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => void saveEdit(g.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 rounded hover:bg-emerald-800"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-slate-900">
                      {g.tipo === 'SEGURO'
                        ? 'Seguro Garantia'
                        : g.tipo === 'FIANCA'
                        ? 'Fiança Bancária'
                        : 'Caução em Dinheiro'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <StatusTag
                        label={dias >= 0 ? `Vigente (${dias}d)` : 'Vencida'}
                        tone={tone}
                      />
                      <button
                        type="button"
                        onClick={() => startEdit(g)}
                        className="p-1 text-slate-400 hover:text-[#004A8F] rounded"
                        aria-label="Editar garantia"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setGarantiaToDelete(g)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        aria-label="Excluir garantia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-slate-600">
                    {g.seguradora} · Apólice/Doc: <span className="font-mono">{g.apolice}</span>
                  </div>
                  <div className="text-sm font-mono tabular-nums font-bold text-[#004A8F]">
                    {formatCurrencyBR(g.valor)}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    Vigência: {formatDateBR(g.inicio)} até {formatDateBR(g.fim)}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Registrar Garantia Contratual</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Modalidade</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoGarantia)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
            >
              <option value="SEGURO">Seguro Garantia</option>
              <option value="FIANCA">Fiança Bancária</option>
              <option value="CAUCAO">Caução</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Seguradora / Banco</label>
            <input
              required
              value={seguradora}
              onChange={(e) => setSeguradora(e.target.value)}
              placeholder="Instituição emissora"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nº Apólice / Documento</label>
            <input
              required
              value={apolice}
              onChange={(e) => setApolice(e.target.value)}
              placeholder="Ex: AP-2026-4410"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Valor Garantido (R$)</label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Início</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Término</label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Garantia</span>
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={Boolean(garantiaToDelete)}
        destructive
        title="Excluir Garantia"
        description={
          garantiaToDelete
            ? `Tem certeza que deseja excluir a garantia apólice "${garantiaToDelete.apolice}" (${garantiaToDelete.seguradora})?`
            : ''
        }
        confirmLabel="Excluir Garantia"
        onCancel={() => setGarantiaToDelete(null)}
        onConfirm={async () => {
          if (garantiaToDelete) {
            await deleteGarantia(garantiaToDelete.id);
          }
          setGarantiaToDelete(null);
        }}
      />
    </div>
  );
}
