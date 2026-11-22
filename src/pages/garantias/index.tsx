import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable, { type ColumnDef } from '../../components/DataTable';
import StatCard from '../../components/StatCard';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Garantia, TipoGarantia } from '../../types';
import { calcularDiasRestantes, formatCurrencyBR, formatDateBR, vigenciaColor } from '../../utils/engineering';

export default function GarantiasPage() {
  const { db, selectedContratoId, addGarantia, updateGarantia, deleteGarantia } = useFiscalStore();
  const [contratoId, setContratoId] = useState(
    selectedContratoId !== 'ALL' ? selectedContratoId : db.contratos[0]?.id ?? ''
  );
  const [tipo, setTipo] = useState<TipoGarantia>('SEGURO');
  const [seguradora, setSeguradora] = useState('');
  const [apolice, setApolice] = useState('');
  const [valor, setValor] = useState('210000');
  const [inicio, setInicio] = useState('2026-11-21');
  const [fim, setFim] = useState('2027-11-21');

  const [editingGarantia, setEditingGarantia] = useState<Garantia | null>(null);
  const [eTipo, setETipo] = useState<TipoGarantia>('SEGURO');
  const [eSeguradora, setESeguradora] = useState('');
  const [eApolice, setEApolice] = useState('');
  const [eValor, setEValor] = useState('');
  const [eInicio, setEInicio] = useState('');
  const [eFim, setEFim] = useState('');
  const [garantiaToDelete, setGarantiaToDelete] = useState<Garantia | null>(null);

  const rows = db.garantias.filter(
    (g) => selectedContratoId === 'ALL' || g.contratoId === selectedContratoId
  );

  const totalGarantido = rows.reduce((acc, g) => acc + g.valor, 0);
  const vencendo = rows.filter((g) => calcularDiasRestantes(g.fim) <= 30).length;

  const getContrato = (id: string) => db.contratos.find((c) => c.id === id);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seguradora.trim() || !apolice.trim()) return;
    await addGarantia({
      contratoId: contratoId || db.contratos[0]?.id || '',
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

  const openEdit = (g: Garantia) => {
    setEditingGarantia(g);
    setETipo(g.tipo);
    setESeguradora(g.seguradora);
    setEApolice(g.apolice);
    setEValor(String(g.valor));
    setEInicio(g.inicio);
    setEFim(g.fim);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGarantia || !eSeguradora.trim() || !eApolice.trim()) return;
    await updateGarantia(editingGarantia.id, {
      tipo: eTipo,
      seguradora: eSeguradora.trim(),
      apolice: eApolice.trim(),
      valor: Number(eValor) || 0,
      inicio: eInicio,
      fim: eFim,
    });
    setEditingGarantia(null);
  };

  const columns: ColumnDef<Garantia>[] = [
    {
      key: 'contrato',
      header: 'Contrato',
      render: (g) => {
        const c = getContrato(g.contratoId);
        return (
          <div>
            <div className="font-mono font-semibold text-[#004A8F]">{c?.numero}</div>
            <div className="text-xs text-slate-500">{c?.contratada}</div>
          </div>
        );
      },
    },
    {
      key: 'tipo',
      header: 'Modalidade',
      render: (g) => <span className="font-medium text-slate-900">{g.tipo}</span>,
    },
    {
      key: 'seguradora',
      header: 'Emissor / Apólice',
      render: (g) => (
        <div>
          <div className="text-slate-900">{g.seguradora}</div>
          <div className="text-xs font-mono text-slate-500">{g.apolice}</div>
        </div>
      ),
    },
    {
      key: 'valor',
      header: 'Valor Segurado',
      align: 'right',
      render: (g) => (
        <span className="font-mono tabular-nums font-semibold">{formatCurrencyBR(g.valor)}</span>
      ),
    },
    {
      key: 'vigencia',
      header: 'Vigência',
      render: (g) => {
        const dias = calcularDiasRestantes(g.fim);
        const cor = vigenciaColor(dias);
        const tone = cor === 'error' ? 'error' : cor === 'warning' ? 'warning' : 'success';
        return (
          <div className="space-y-0.5">
            <div className="text-xs font-mono text-slate-600">
              {formatDateBR(g.inicio)} — {formatDateBR(g.fim)}
            </div>
            <StatusTag
              label={dias >= 0 ? `${dias}d restantes` : 'Vencida'}
              tone={tone}
            />
          </div>
        );
      },
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'right',
      render: (g) => (
        <div className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openEdit(g)}
            className="p-1.5 text-slate-400 hover:text-[#004A8F] rounded"
            aria-label="Editar garantia"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setGarantiaToDelete(g)}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded"
            aria-label="Excluir garantia"
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Garantias Contratuais</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Monitoramento de apólices de seguro-garantia, cartas de fiança bancária e cauções.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Garantias Registradas" value={String(rows.length)} />
        <StatCard title="Montante Garantido" value={formatCurrencyBR(totalGarantido)} />
        <StatCard
          title="Vencendo em ≤ 30 dias"
          value={String(vencendo)}
          tone={vencendo > 0 ? 'warning' : 'success'}
        />
      </div>

      <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Cadastrar Garantia</h2>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
            <label className="block text-xs text-slate-500 mb-1">Modalidade</label>
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
            <label className="block text-xs text-slate-500 mb-1">Valor (R$)</label>
            <input
              type="number"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Seguradora / Banco</label>
            <input
              required
              value={seguradora}
              onChange={(e) => setSeguradora(e.target.value)}
              placeholder="Instituição emissora"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Apólice / Documento</label>
            <input
              required
              value={apolice}
              onChange={(e) => setApolice(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Fim Vigência</label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar</span>
          </button>
        </div>
      </form>

      <DataTable columns={columns} rows={rows} rowKey={(g) => g.id} />

      {editingGarantia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Editar Garantia Contratual
              </h3>
              <button
                type="button"
                onClick={() => setEditingGarantia(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Modalidade</label>
                  <select
                    value={eTipo}
                    onChange={(e) => setETipo(e.target.value as TipoGarantia)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  >
                    <option value="SEGURO">Seguro Garantia</option>
                    <option value="FIANCA">Fiança Bancária</option>
                    <option value="CAUCAO">Caução</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Valor Garantido (R$)</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={eValor}
                    onChange={(e) => setEValor(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Seguradora / Banco</label>
                  <input
                    required
                    value={eSeguradora}
                    onChange={(e) => setESeguradora(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Nº Apólice / Documento</label>
                  <input
                    required
                    value={eApolice}
                    onChange={(e) => setEApolice(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Início Vigência</label>
                  <input
                    type="date"
                    value={eInicio}
                    onChange={(e) => setEInicio(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Fim Vigência</label>
                  <input
                    type="date"
                    value={eFim}
                    onChange={(e) => setEFim(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingGarantia(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Garantia</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
