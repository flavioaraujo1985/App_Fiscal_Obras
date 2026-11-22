import { ArrowLeft, Edit3, FileDown, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatCard from '../../components/StatCard';
import { medicaoService } from '../../services/medicao.service';
import { gerarPdfBoletimMedicao } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { StatusMedicao } from '../../types';
import { formatCurrencyBR } from '../../utils/engineering';
import AvaliacaoDesempenhoTab from './AvaliacaoDesempenhoTab';
import ItensMedicao from './ItensMedicao';
import MemoriaCalculo from './MemoriaCalculo';
import ParecerFiscal from './ParecerFiscal';
import RelatorioFotografico from './RelatorioFotografico';
import ResumoMedicao from './ResumoMedicao';

type MedicaoTab = 'RESUMO' | 'ITENS' | 'MEMORIA' | 'FOTOS' | 'PARECER' | 'AVALIACAO';

export default function MedicaoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db, updateMedicao, deleteMedicao, pushToast } = useFiscalStore();
  const medicao = db.medicoes.find((m) => m.id === id);
  const contrato = medicao ? db.contratos.find((c) => c.id === medicao.contratoId) : undefined;

  const [tab, setTab] = useState<MedicaoTab>(() =>
    medicao && medicao.status === 'RASCUNHO' && medicao.valor === 0 ? 'ITENS' : 'RESUMO'
  );
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editNumero, setEditNumero] = useState('');
  const [editCompetencia, setEditCompetencia] = useState('');
  const [editDataInicio, setEditDataInicio] = useState('');
  const [editDataFim, setEditDataFim] = useState('');
  const [editStatus, setEditStatus] = useState<StatusMedicao>('RASCUNHO');

  if (!medicao || !contrato) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-sm font-semibold text-slate-900">Medição não encontrada.</p>
        <button
          type="button"
          onClick={() => navigate('/medicoes')}
          className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md"
        >
          Voltar para Medições
        </button>
      </div>
    );
  }

  const acumuladoPercent = medicaoService.percentualAcumuladoContrato(contrato, db.medicoes);

  const handleGerarPdf = async () => {
    setGerandoPdf(true);
    try {
      await gerarPdfBoletimMedicao({
        medicao,
        contrato,
        config: db.configuracoes,
        acumuladoPercent,
      });
      pushToast('success', 'Boletim de Medição exportado em PDF e salvo no dispositivo.');
    } finally {
      setGerandoPdf(false);
    }
  };

  const openEditModal = () => {
    setEditNumero(String(medicao.numero));
    setEditCompetencia(medicao.competencia);
    setEditDataInicio(medicao.dataInicio);
    setEditDataFim(medicao.dataFim);
    setEditStatus(medicao.status);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numParsed = Math.max(1, Math.round(Number(editNumero) || medicao.numero));
    await updateMedicao(
      medicao.id,
      {
        numero: numParsed,
        competencia: editCompetencia.trim() || medicao.competencia,
        dataInicio: editDataInicio,
        dataFim: editDataFim,
        status: editStatus,
      },
      `Dados do Boletim de Medição nº ${numParsed} editados.`
    );
    setEditOpen(false);
    pushToast('success', 'Dados do Boletim de Medição atualizados.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/medicoes')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-2 no-print"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Boletins de Medição</span>
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Boletim de Medição nº {medicao.numero.toString().padStart(2, '0')} · {contrato.numero}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{contrato.objeto}</p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar Boletim</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmExcluirOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir Medição</span>
          </button>
          <button
            type="button"
            disabled={gerandoPdf}
            onClick={() => void handleGerarPdf()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <FileDown className="w-4 h-4" />
            <span>{gerandoPdf ? 'Gerando...' : 'Baixar Boletim (PDF)'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard title="Valor Medido" value={formatCurrencyBR(medicao.valor)} />
        <StatCard title="% do Contrato" value={`${medicao.percentual.toFixed(2)}%`} />
        <StatCard
          title="Itens Medidos"
          value={String(medicao.itensMedidos.filter((i) => i.quantidadeMedida > 0).length)}
          subtitle={`${medicao.itensMedidos.length} itens na planilha`}
        />
      </div>

      <div className="border-b border-slate-200 overflow-x-auto no-print">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { key: 'RESUMO' as const, label: 'Resumo, NF & Assinaturas' },
            { key: 'ITENS' as const, label: `Itens Medidos (${medicao.itensMedidos.length})` },
            { key: 'MEMORIA' as const, label: `Memória de Cálculo (${medicao.memoriasCalculo.length})` },
            { key: 'FOTOS' as const, label: `Relatório Fotográfico (${medicao.fotos.length})` },
            { key: 'PARECER' as const, label: 'Parecer Fiscal' },
            {
              key: 'AVALIACAO' as const,
              label: medicao.avaliacaoDesempenho
                ? `Avaliação de Desempenho (${medicao.avaliacaoDesempenho.maa.toFixed(1)})`
                : 'Avaliação de Desempenho',
            },
          ].map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                tab === t.key
                  ? 'border-[#004A8F] text-[#004A8F]'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'RESUMO' && (
        <ResumoMedicao
          medicao={medicao}
          contrato={contrato}
          onIrParaItens={() => setTab('ITENS')}
        />
      )}
      {tab === 'ITENS' && <ItensMedicao medicao={medicao} contrato={contrato} />}
      {tab === 'MEMORIA' && <MemoriaCalculo medicao={medicao} />}
      {tab === 'FOTOS' && <RelatorioFotografico medicao={medicao} contrato={contrato} />}
      {tab === 'PARECER' && <ParecerFiscal medicao={medicao} />}
      {tab === 'AVALIACAO' && <AvaliacaoDesempenhoTab medicao={medicao} contrato={contrato} />}

      <ConfirmDialog
        open={confirmExcluirOpen}
        destructive
        title="Excluir Boletim de Medição"
        description={`Tem certeza que deseja excluir o Boletim de Medição nº ${medicao.numero.toString().padStart(2, '0')} (${medicao.competencia})? Itens medidos, memórias de cálculo, fotos, avaliação de desempenho e eventual processo GEFISPAG vinculado serão removidos.`}
        confirmLabel="Excluir Medição"
        onCancel={() => setConfirmExcluirOpen(false)}
        onConfirm={async () => {
          setConfirmExcluirOpen(false);
          await deleteMedicao(medicao.id);
          navigate('/medicoes');
        }}
      />

      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-base font-bold text-slate-900">
                Editar Boletim de Medição
              </h2>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nº Medição *</label>
                  <input
                    required
                    type="number"
                    min={1}
                    value={editNumero}
                    onChange={(e) => setEditNumero(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Competência *</label>
                  <input
                    required
                    value={editCompetencia}
                    onChange={(e) => setEditCompetencia(e.target.value)}
                    placeholder="2026-11"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Início *</label>
                  <input
                    required
                    type="date"
                    value={editDataInicio}
                    onChange={(e) => setEditDataInicio(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Fim *</label>
                  <input
                    required
                    type="date"
                    value={editDataFim}
                    onChange={(e) => setEditDataFim(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as StatusMedicao)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                >
                  <option value="RASCUNHO">RASCUNHO</option>
                  <option value="EM_ANALISE">EM ANÁLISE</option>
                  <option value="APROVADA">APROVADA</option>
                  <option value="PROCESSO_PAGAMENTO">PROCESSO PAGAMENTO</option>
                  <option value="PAGA">PAGA</option>
                  <option value="REJEITADA">REJEITADA</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
