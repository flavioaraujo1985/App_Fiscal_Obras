import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DataTable, { type ColumnDef } from '../../components/DataTable';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { NaoConformidade, StatusNC } from '../../types';
import { formatDateBR, prazoNcStatus } from '../../utils/engineering';

export default function NcList({ onNewNc }: { onNewNc: () => void }) {
  const navigate = useNavigate();
  const { db, loading, selectedContratoId } = useFiscalStore();
  const [statusFilter, setStatusFilter] = useState<'ALL' | StatusNC>('ALL');

  const rows = db.naoConformidades.filter((nc) => {
    if (selectedContratoId !== 'ALL' && nc.contratoId !== selectedContratoId) return false;
    if (statusFilter !== 'ALL' && nc.status !== statusFilter) return false;
    return true;
  });

  const getContratoNum = (id: string) =>
    db.contratos.find((c) => c.id === id)?.numero ?? id;

  const columns: ColumnDef<NaoConformidade>[] = [
    {
      key: 'codigo',
      header: 'Código',
      render: (nc) => (
        <div>
          <div className="font-mono font-semibold text-[#004A8F]">{nc.codigo}</div>
          <div className="text-xs text-slate-500">Contrato {getContratoNum(nc.contratoId)}</div>
        </div>
      ),
    },
    {
      key: 'titulo',
      header: 'Não Conformidade / Origem',
      render: (nc) => (
        <div className="max-w-md">
          <div className="font-medium text-slate-900 truncate">{nc.titulo}</div>
          <div className="text-xs text-slate-500">
            Origem: {nc.origem} · Aberta em {formatDateBR(nc.dataRegistro)}
          </div>
        </div>
      ),
    },
    {
      key: 'gravidade',
      header: 'Gravidade',
      render: (nc) => (
        <StatusTag
          label={nc.gravidade}
          tone={
            nc.gravidade === 'CRITICA' || nc.gravidade === 'ALTA'
              ? 'error'
              : nc.gravidade === 'MEDIA'
              ? 'warning'
              : 'neutral'
          }
        />
      ),
    },
    {
      key: 'prazo',
      header: 'Prazo Correção',
      render: (nc) => {
        const p = prazoNcStatus(nc);
        return <StatusTag label={p.label} tone={p.tone} />;
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (nc) => (
        <StatusTag
          label={nc.status.replace('_', ' ')}
          tone={
            nc.status === 'ENCERRADA' || nc.status === 'VALIDADA'
              ? 'success'
              : nc.status === 'CORRIGIDA'
              ? 'info'
              : 'warning'
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
          {(['ALL', 'ABERTA', 'EM_TRATAMENTO', 'CORRIGIDA', 'VALIDADA', 'ENCERRADA'] as const).map(
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
          onClick={onNewNc}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar NC</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(nc) => nc.id}
        onRowClick={(nc) => navigate(`/inconformidades/${nc.id}`)}
        loading={loading}
        emptyTitle="Nenhuma não conformidade encontrada"
        emptyDescription="Registre uma não conformidade técnica ou ajuste o filtro de status."
      />
    </div>
  );
}
