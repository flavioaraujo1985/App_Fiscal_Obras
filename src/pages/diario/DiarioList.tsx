import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import DataTable, { type ColumnDef } from '../../components/DataTable';
import StatCard from '../../components/StatCard';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { DiarioObra } from '../../types';
import { formatDateBR } from '../../utils/engineering';

export default function DiarioList({ onNewDiario }: { onNewDiario: () => void }) {
  const navigate = useNavigate();
  const { db, loading, selectedContratoId } = useFiscalStore();

  const rows = db.diarios.filter(
    (d) => selectedContratoId === 'ALL' || d.contratoId === selectedContratoId
  );

  const diasTrabalhados = rows.filter((d) => !d.paralisado).length;
  const diasParalisados = rows.filter((d) => d.paralisado).length;
  const diasChuva = rows.filter((d) => d.clima.chuva).length;
  const totalOcorrencias = rows.reduce((acc, d) => acc + d.ocorrencias.length, 0);
  const totalFotos = rows.reduce((acc, d) => acc + d.fotos.length, 0);

  const getContrato = (id: string) => db.contratos.find((c) => c.id === id);

  const columns: ColumnDef<DiarioObra>[] = [
    {
      key: 'data',
      header: 'Data RDO',
      render: (d) => (
        <span className="font-mono font-semibold text-[#004A8F]">{formatDateBR(d.data)}</span>
      ),
    },
    {
      key: 'contrato',
      header: 'Contrato / Obra',
      render: (d) => {
        const c = getContrato(d.contratoId);
        return (
          <div>
            <div className="font-medium text-slate-900">
              {c ? `${c.numero} · ${c.contratada}` : d.contratoId}
            </div>
            <div className="text-xs text-slate-500 truncate max-w-md">{d.observacoes}</div>
          </div>
        );
      },
    },
    {
      key: 'clima',
      header: 'Clima',
      render: (d) => (
        <span className="font-mono text-xs text-slate-700">
          {d.clima.temperatura}°C · {d.clima.chuva ? 'Chuva' : 'Tempo firme'}
        </span>
      ),
    },
    {
      key: 'efetivo',
      header: 'Efetivo',
      align: 'right',
      render: (d) => {
        const total = d.efetivo.reduce((acc, e) => acc + e.quantidade, 0);
        return <span className="font-mono tabular-nums">{total} trab.</span>;
      },
    },
    {
      key: 'ocorrencias',
      header: 'Ocorrências',
      align: 'right',
      render: (d) => (
        <span
          className={`font-mono tabular-nums font-medium ${
            d.ocorrencias.length > 0 ? 'text-amber-700' : 'text-slate-500'
          }`}
        >
          {d.ocorrencias.length}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (d) => (
        <StatusTag
          label={d.status}
          tone={
            d.status === 'ASSINADO' || d.status === 'ARQUIVADO'
              ? 'success'
              : d.status === 'FECHADO'
              ? 'info'
              : 'warning'
          }
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard title="Qtd de RDOs" value={String(rows.length)} />
        <StatCard title="Dias Trabalhados" value={String(diasTrabalhados)} tone="success" />
        <StatCard title="Dias Paralisados" value={String(diasParalisados)} />
        <StatCard title="Registros de Chuva" value={String(diasChuva)} />
        <StatCard
          title="Ocorrências"
          value={String(totalOcorrencias)}
          tone={totalOcorrencias > 0 ? 'warning' : 'default'}
        />
        <StatCard title="Fotos Registradas" value={String(totalFotos)} />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onNewDiario}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo RDO</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(d) => d.id}
        onRowClick={(d) => navigate(`/diario/${d.id}`)}
        loading={loading}
        emptyTitle="Nenhum Diário de Obra registrado"
        emptyDescription="Registre o acompanhamento diário de clima, efetivo, equipamentos e atividades."
      />
    </div>
  );
}
