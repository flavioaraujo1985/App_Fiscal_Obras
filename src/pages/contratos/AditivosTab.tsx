import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Aditivo, Contrato, TipoAditivo } from '../../types';
import { formatCurrencyBR, formatDateBR } from '../../utils/engineering';

export default function AditivosTab({ contrato }: { contrato: Contrato }) {
  const { db, addAditivo, updateAditivo, deleteAditivo } = useFiscalStore();
  const aditivos = db.aditivos.filter((a) => a.contratoId === contrato.id);

  const [tipo, setTipo] = useState<TipoAditivo>('VALOR');
  const [valor, setValor] = useState('0');
  const [dias, setDias] = useState('0');
  const [dataAssinatura, setDataAssinatura] = useState('2026-11-21');
  const [justificativa, setJustificativa] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eTipo, setETipo] = useState<TipoAditivo>('VALOR');
  const [eValor, setEValor] = useState('0');
  const [eDias, setEDias] = useState('0');
  const [eData, setEData] = useState('');
  const [eJust, setEJust] = useState('');
  const [aditivoToDelete, setAditivoToDelete] = useState<Aditivo | null>(null);

  const totalValor = aditivos
    .filter((a) => a.tipo === 'VALOR')
    .reduce((acc, a) => acc + a.valor, 0);
  const percentualAcrescimo =
    contrato.valorInicial > 0 ? (totalValor / contrato.valorInicial) * 100 : 0;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificativa.trim()) return;
    await addAditivo({
      contratoId: contrato.id,
      tipo,
      valor: tipo === 'VALOR' ? Number(valor) || 0 : 0,
      dias: tipo === 'PRAZO' ? Number(dias) || 0 : 0,
      dataAssinatura,
      justificativa: justificativa.trim(),
    });
    setJustificativa('');
    setValor('0');
    setDias('0');
  };

  const startEdit = (a: Aditivo) => {
    setEditingId(a.id);
    setETipo(a.tipo);
    setEValor(String(a.valor));
    setEDias(String(a.dias));
    setEData(a.dataAssinatura);
    setEJust(a.justificativa);
  };

  const saveEdit = async (id: string) => {
    if (!eJust.trim()) return;
    await updateAditivo(id, {
      tipo: eTipo,
      valor: eTipo === 'VALOR' ? Number(eValor) || 0 : 0,
      dias: eTipo === 'PRAZO' ? Number(eDias) || 0 : 0,
      dataAssinatura: eData,
      justificativa: eJust.trim(),
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Valor Inicial</div>
          <div className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">
            {formatCurrencyBR(contrato.valorInicial)}
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Aditivos de Valor</div>
          <div className="text-lg font-bold font-mono tabular-nums text-[#004A8F] mt-1">
            {formatCurrencyBR(totalValor)} ({percentualAcrescimo.toFixed(1)}%)
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Valor Atualizado</div>
          <div className="text-lg font-bold font-mono tabular-nums text-emerald-700 mt-1">
            {formatCurrencyBR(contrato.valorAtual)}
          </div>
        </div>
      </div>

      <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-900">Registrar Termo Aditivo</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAditivo)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
            >
              <option value="VALOR">Aditivo de Valor</option>
              <option value="PRAZO">Aditivo de Prazo</option>
            </select>
          </div>
          {tipo === 'VALOR' ? (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Valor (R$)</label>
              <input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Dias Prorrogados</label>
              <input
                type="number"
                value={dias}
                onChange={(e) => setDias(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data Assinatura</label>
            <input
              type="date"
              value={dataAssinatura}
              onChange={(e) => setDataAssinatura(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar</span>
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Justificativa Técnica</label>
          <input
            required
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Fundamentação técnica e jurídica do termo aditivo..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
          />
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {aditivos.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhum termo aditivo registrado para este contrato.
          </div>
        ) : (
          aditivos.map((a) => {
            const isEditing = editingId === a.id;
            return (
              <div key={a.id} className="p-4 space-y-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <select
                        value={eTipo}
                        onChange={(e) => setETipo(e.target.value as TipoAditivo)}
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      >
                        <option value="VALOR">Aditivo de Valor</option>
                        <option value="PRAZO">Aditivo de Prazo</option>
                      </select>
                      {eTipo === 'VALOR' ? (
                        <input
                          type="number"
                          step="0.01"
                          value={eValor}
                          onChange={(e) => setEValor(e.target.value)}
                          placeholder="Valor (R$)"
                          className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                        />
                      ) : (
                        <input
                          type="number"
                          value={eDias}
                          onChange={(e) => setEDias(e.target.value)}
                          placeholder="Dias"
                          className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                        />
                      )}
                      <input
                        type="date"
                        value={eData}
                        onChange={(e) => setEData(e.target.value)}
                        className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                      />
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void saveEdit(a.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded hover:bg-emerald-800"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      </div>
                    </div>
                    <input
                      value={eJust}
                      onChange={(e) => setEJust(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {a.numero}º Termo Aditivo
                        </span>
                        <StatusTag label={a.tipo} tone={a.tipo === 'VALOR' ? 'info' : 'warning'} />
                        <span className="text-xs font-mono text-slate-500">
                          {formatDateBR(a.dataAssinatura)}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 mt-1">{a.justificativa}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                        {a.tipo === 'VALOR' ? formatCurrencyBR(a.valor) : `+${a.dias} dias`}
                      </span>
                      <button
                        type="button"
                        onClick={() => startEdit(a)}
                        className="p-1.5 text-slate-400 hover:text-[#004A8F] rounded"
                        aria-label="Editar aditivo"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setAditivoToDelete(a)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        aria-label="Excluir aditivo"
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
        open={Boolean(aditivoToDelete)}
        destructive
        title="Excluir Termo Aditivo"
        description={
          aditivoToDelete
            ? `Confirma a exclusão do ${aditivoToDelete.numero}º Termo Aditivo (${aditivoToDelete.tipo})? O valor atualizado do contrato será recalculado automaticamente.`
            : ''
        }
        confirmLabel="Excluir Aditivo"
        onCancel={() => setAditivoToDelete(null)}
        onConfirm={async () => {
          if (aditivoToDelete) {
            await deleteAditivo(aditivoToDelete.id);
          }
          setAditivoToDelete(null);
        }}
      />
    </div>
  );
}
