import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable, { type ColumnDef } from '../../components/DataTable';
import StatCard from '../../components/StatCard';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Aditivo, TipoAditivo } from '../../types';
import { formatCurrencyBR, formatDateBR } from '../../utils/engineering';

export default function AditivosPage() {
  const { db, selectedContratoId, addAditivo, updateAditivo, deleteAditivo } = useFiscalStore();
  const [contratoId, setContratoId] = useState(
    selectedContratoId !== 'ALL' ? selectedContratoId : db.contratos[0]?.id ?? ''
  );
  const [tipo, setTipo] = useState<TipoAditivo>('VALOR');
  const [valor, setValor] = useState('');
  const [dias, setDias] = useState('');
  const [dataAssinatura, setDataAssinatura] = useState('2026-11-21');
  const [justificativa, setJustificativa] = useState('');

  const [editingAditivo, setEditingAditivo] = useState<Aditivo | null>(null);
  const [eTipo, setETipo] = useState<TipoAditivo>('VALOR');
  const [eValor, setEValor] = useState('');
  const [eDias, setEDias] = useState('');
  const [eData, setEData] = useState('');
  const [eJust, setEJust] = useState('');
  const [aditivoToDelete, setAditivoToDelete] = useState<Aditivo | null>(null);

  const rows = db.aditivos.filter(
    (a) => selectedContratoId === 'ALL' || a.contratoId === selectedContratoId
  );

  const totalValor = rows.filter((r) => r.tipo === 'VALOR').reduce((acc, r) => acc + r.valor, 0);
  const totalDias = rows.filter((r) => r.tipo === 'PRAZO').reduce((acc, r) => acc + r.dias, 0);

  const getContrato = (id: string) => db.contratos.find((c) => c.id === id);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCtr = contratoId || db.contratos[0]?.id;
    if (!targetCtr || !justificativa.trim()) return;
    await addAditivo({
      contratoId: targetCtr,
      tipo,
      valor: tipo === 'VALOR' ? Number(valor) || 0 : 0,
      dias: tipo === 'PRAZO' ? Number(dias) || 0 : 0,
      dataAssinatura,
      justificativa: justificativa.trim(),
    });
    setJustificativa('');
    setValor('');
    setDias('');
  };

  const openEdit = (a: Aditivo) => {
    setEditingAditivo(a);
    setETipo(a.tipo);
    setEValor(String(a.valor));
    setEDias(String(a.dias));
    setEData(a.dataAssinatura);
    setEJust(a.justificativa);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAditivo || !eJust.trim()) return;
    await updateAditivo(editingAditivo.id, {
      tipo: eTipo,
      valor: eTipo === 'VALOR' ? Number(eValor) || 0 : 0,
      dias: eTipo === 'PRAZO' ? Number(eDias) || 0 : 0,
      dataAssinatura: eData,
      justificativa: eJust.trim(),
    });
    setEditingAditivo(null);
  };

  const columns: ColumnDef<Aditivo>[] = [
    {
      key: 'numero',
      header: 'Termo',
      render: (a) => (
        <span className="font-mono font-semibold text-[#004A8F]">
          {a.numero}º Aditivo
        </span>
      ),
    },
    {
      key: 'contrato',
      header: 'Contrato',
      render: (a) => {
        const c = getContrato(a.contratoId);
        return (
          <div>
            <div className="font-mono text-xs font-semibold text-slate-900">{c?.numero}</div>
            <div className="text-xs text-slate-500">{c?.contratada}</div>
          </div>
        );
      },
    },
    {
      key: 'tipo',
      header: 'Modalidade',
      render: (a) => (
        <StatusTag label={a.tipo} tone={a.tipo === 'VALOR' ? 'info' : 'warning'} />
      ),
    },
    {
      key: 'justificativa',
      header: 'Justificativa',
      render: (a) => <div className="max-w-md text-xs text-slate-700 truncate">{a.justificativa}</div>,
    },
    {
      key: 'impacto',
      header: 'Impacto',
      align: 'right',
      render: (a) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {a.tipo === 'VALOR' ? formatCurrencyBR(a.valor) : `+${a.dias} dias`}
        </span>
      ),
    },
    {
      key: 'data',
      header: 'Assinatura',
      render: (a) => <span className="font-mono text-xs">{formatDateBR(a.dataAssinatura)}</span>,
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (a) => (
        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openEdit(a)}
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
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Termos Aditivos</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Controle consolidado de acréscimos de valor e prorrogações de prazo contratual.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Total de Aditivos" value={String(rows.length)} />
        <StatCard title="Acréscimos Financeiros" value={formatCurrencyBR(totalValor)} />
        <StatCard title="Dias Prorrogados" value={`${totalDias} dias`} />
      </div>

      <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Novo Termo Aditivo</h2>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          <div className="sm:col-span-2">
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
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoAditivo)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
            >
              <option value="VALOR">Valor (R$)</option>
              <option value="PRAZO">Prazo (Dias)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              {tipo === 'VALOR' ? 'Valor (R$)' : 'Dias'}
            </label>
            <input
              required
              type="number"
              step={tipo === 'VALOR' ? '0.01' : '1'}
              value={tipo === 'VALOR' ? valor : dias}
              onChange={(e) =>
                tipo === 'VALOR' ? setValor(e.target.value) : setDias(e.target.value)
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Assinatura</label>
            <input
              type="date"
              value={dataAssinatura}
              onChange={(e) => setDataAssinatura(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs text-slate-500 mb-1">Justificativa Técnica</label>
            <input
              required
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Descreva a motivação técnica do aditivo..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Aditivo</span>
          </button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} rowKey={(a) => a.id} />

      {editingAditivo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Editar {editingAditivo.numero}º Termo Aditivo
              </h3>
              <button
                type="button"
                onClick={() => setEditingAditivo(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Tipo</label>
                  <select
                    value={eTipo}
                    onChange={(e) => setETipo(e.target.value as TipoAditivo)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  >
                    <option value="VALOR">Valor (R$)</option>
                    <option value="PRAZO">Prazo (Dias)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {eTipo === 'VALOR' ? 'Valor (R$)' : 'Dias'}
                  </label>
                  <input
                    required
                    type="number"
                    step={eTipo === 'VALOR' ? '0.01' : '1'}
                    value={eTipo === 'VALOR' ? eValor : eDias}
                    onChange={(e) =>
                      eTipo === 'VALOR' ? setEValor(e.target.value) : setEDias(e.target.value)
                    }
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Assinatura</label>
                  <input
                    type="date"
                    value={eData}
                    onChange={(e) => setEData(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Justificativa Técnica</label>
                <textarea
                  required
                  rows={3}
                  value={eJust}
                  onChange={(e) => setEJust(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingAditivo(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Aditivo</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(aditivoToDelete)}
        destructive
        title="Excluir Termo Aditivo"
        description={
          aditivoToDelete
            ? `Tem certeza que deseja excluir o ${aditivoToDelete.numero}º Termo Aditivo? O valor atualizado do contrato será recalculado.`
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
