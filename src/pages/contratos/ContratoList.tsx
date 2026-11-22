import { Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import DataTable, { type ColumnDef } from '../../components/DataTable';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, ContratoStatus } from '../../types';
import {
  calcularDiasRestantes,
  calcularSaldoContrato,
  formatCurrencyBR,
  formatDateBR,
  vigenciaColor,
} from '../../utils/engineering';

interface ContratoListProps {
  onNewContrato: () => void;
}

export default function ContratoList({ onNewContrato }: ContratoListProps) {
  const navigate = useNavigate();
  const { db, loading, selectedContratoId, deleteContrato } = useFiscalStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | ContratoStatus>('ALL');
  const [contratoParaExcluir, setContratoParaExcluir] = useState<Contrato | null>(null);

  const rows = db.contratos.filter((c) => {
    if (selectedContratoId !== 'ALL' && c.id !== selectedContratoId) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.numero.toLowerCase().includes(q) ||
        c.contratada.toLowerCase().includes(q) ||
        c.objeto.toLowerCase().includes(q) ||
        c.processo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const columns: ColumnDef<Contrato>[] = [
    {
      key: 'numero',
      header: 'Contrato',
      render: (c) => (
        <div>
          <div className="font-mono font-semibold text-[#004A8F]">{c.numero}</div>
          <div className="text-xs text-slate-500 font-mono">{c.processo}</div>
        </div>
      ),
    },
    {
      key: 'contratada',
      header: 'Empresa Contratada / Objeto',
      render: (c) => (
        <div className="max-w-md">
          <div className="font-medium text-slate-900 truncate">{c.contratada}</div>
          <div className="text-xs text-slate-500 truncate">{c.objeto}</div>
        </div>
      ),
    },
    {
      key: 'valorAtual',
      header: 'Valor Atualizado',
      align: 'right',
      render: (c) => (
        <span className="font-mono tabular-nums font-medium text-slate-900">
          {formatCurrencyBR(c.valorAtual)}
        </span>
      ),
    },
    {
      key: 'execucao',
      header: 'Executado',
      align: 'right',
      render: (c) => {
        const resumo = calcularSaldoContrato(c, db.aditivos, db.medicoes);
        return (
          <div className="text-right">
            <div className="font-mono tabular-nums text-xs font-semibold text-slate-900">
              {resumo.percentual.toFixed(1)}%
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-500">
              {formatCurrencyBR(resumo.executado)}
            </div>
          </div>
        );
      },
    },
    {
      key: 'vigencia',
      header: 'Vigência',
      render: (c) => {
        const dias = calcularDiasRestantes(c.dataFim);
        const cor = vigenciaColor(dias);
        const tone = cor === 'error' ? 'error' : cor === 'warning' ? 'warning' : 'success';
        return (
          <div className="space-y-0.5">
            <div className="text-xs font-mono tabular-nums text-slate-600">
              Até {formatDateBR(c.dataFim)}
            </div>
            <StatusTag
              label={dias >= 0 ? `${dias} dias` : `Vencido (${Math.abs(dias)}d)`}
              tone={tone}
            />
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => {
        const tone =
          c.status === 'ATIVO' ? 'success' : c.status === 'SUSPENSO' ? 'warning' : 'neutral';
        return <StatusTag label={c.status} tone={tone} />;
      },
    },
    {
      key: 'acoes',
      header: 'Ações',
      align: 'center',
      width: '80px',
      render: (c) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setContratoParaExcluir(c);
          }}
          title={`Excluir contrato ${c.numero}`}
          aria-label={`Excluir contrato ${c.numero}`}
          className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nº, empresa, processo ou objeto..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            {(['ALL', 'ATIVO', 'SUSPENSO', 'ENCERRADO'] as const).map((st) => (
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
                {st === 'ALL' ? 'Todos' : st}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onNewContrato}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] transition-colors whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Contrato</span>
        </button>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        onRowClick={(c) => navigate(`/contratos/${c.id}`)}
        loading={loading}
        emptyTitle="Nenhum contrato localizado"
        emptyDescription="Cadastre um novo contrato administrativo para iniciar a fiscalização."
        emptyAction={
          <button
            type="button"
            onClick={onNewContrato}
            className="px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            Novo Contrato
          </button>
        }
      />

      <ConfirmDialog
        open={Boolean(contratoParaExcluir)}
        destructive
        title="Excluir Contrato"
        description={
          contratoParaExcluir
            ? `Tem certeza que deseja excluir o Contrato ${contratoParaExcluir.numero} (${contratoParaExcluir.contratada})? Todos os aditivos, medições, diários de obra, não conformidades, documentos e processos vinculados serão removidos do dispositivo.`
            : ''
        }
        confirmLabel="Excluir Contrato"
        onCancel={() => setContratoParaExcluir(null)}
        onConfirm={() => {
          if (!contratoParaExcluir) return;
          const targetId = contratoParaExcluir.id;
          setContratoParaExcluir(null);
          void deleteContrato(targetId);
        }}
      />
    </div>
  );
}
