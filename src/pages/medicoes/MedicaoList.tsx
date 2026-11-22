import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable, { type ColumnDef } from '../../components/DataTable';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Medicao, StatusMedicao } from '../../types';
import { formatCurrencyBR, formatDateBR } from '../../utils/engineering';

interface MedicaoListProps {
  onNewMedicao: () => void;
}

export default function MedicaoList({ onNewMedicao }: MedicaoListProps) {
  const navigate = useNavigate();
  const { db, loading, selectedContratoId } = useFiscalStore();
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusMedicao>('ALL');

  const rows = db.medicoes.filter((m) => {
    if (selectedContratoId !== 'ALL' && m.contratoId !== selectedContratoId) return false;
    if (statusFilter !== 'ALL' && m.status !== statusFilter) return false;
    return true;
  });

  const getContrato = (contratoId: string) =>
    db.contratos.find((c) => c.id === contratoId);

  const columns: ColumnDef<Medicao>[] = [
    {
      key: 'numero',
      header: 'Boletim',
      render: (m) => (
        <div>
          <div className="font-mono font-semibold text-[#004A8F]">
            Medição nº {m.numero.toString().padStart(2, '0')}
          </div>
          <div className="text-xs text-slate-500 font-mono">Comp. {m.competencia}</div>
        </div>
      ),
    },
    {
      key: 'contrato',
      header: 'Contrato / Empresa',
      render: (m) => {
        const ctr = getContrato(m.contratoId);
        return (
          <div>
            <div className="font-medium text-slate-900">
              {ctr ? `${ctr.numero} · ${ctr.contratada}` : m.contratoId}
            </div>
            <div className="text-xs text-slate-500 font-mono">
              Período: {formatDateBR(m.dataInicio)} a {formatDateBR(m.dataFim)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'valor',
      header: 'Valor Medido',
      align: 'right',
      render: (m) => (
        <span className="font-mono tabular-nums font-semibold text-slate-900">
          {formatCurrencyBR(m.valor)}
        </span>
      ),
    },
    {
      key: 'percentual',
      header: '% Contrato',
      align: 'right',
      render: (m) => (
        <span className="font-mono tabular-nums text-slate-700">
          {m.percentual.toFixed(2)}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (m) => {
        const tone =
          m.status === 'PAGA' || m.status === 'APROVADA'
            ? 'success'
            : m.status === 'REJEITADA'
            ? 'error'
            : m.status === 'EM_ANALISE' || m.status === 'PROCESSO_PAGAMENTO'
            ? 'warning'
            : 'info';
        return <StatusTag label={m.status.replace('_', ' ')} tone={tone} />;
      },
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(['ALL', 'RASCUNHO', 'EM_ANALISE', 'APROVADA', 'PROCESSO_PAGAMENTO', 'PAGA'] as const).map(
            (st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  statusFilter === st
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {st === 'ALL' ? 'Todas' : st.replace('_', ' ')}
              </button>
            )
          )}
        </div>

        <button
          type="button"
          onClick={onNewMedicao}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nova Medição</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(m) => m.id}
        onRowClick={(m) => navigate(`/medicoes/${m.id}`)}
        loading={loading}
        emptyTitle="Nenhuma medição localizada"
        emptyDescription="Crie um novo boletim de medição para aferir serviços executados."
      />
    </div>
  );
}
