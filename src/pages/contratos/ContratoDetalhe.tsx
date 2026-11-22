import { ArrowLeft, Check, CheckSquare, Edit3, FileDown, FileSpreadsheet, Plus, Square, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AssinaturasPanel from '../../components/AssinaturasPanel';
import ConfirmDialog from '../../components/ConfirmDialog';
import ImportPlanilhaModal from '../../components/ImportPlanilhaModal';
import StatCard from '../../components/StatCard';
import StatusTag from '../../components/StatusTag';
import { contratoService } from '../../services/contrato.service';
import { gerarPdfFichaContrato } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { ChecklistContrato, ContratoStatus, ItemContrato } from '../../types';
import {
  calcularChecklistContrato,
  calcularDiasRestantes,
  calcularSaldoContrato,
  formatCurrencyBR,
  formatDateBR,
  vigenciaColor,
} from '../../utils/engineering';
import AditivosTab from './AditivosTab';
import CronogramaTab from './CronogramaTab';
import DocumentosTab from './DocumentosTab';
import GarantiasTab from './GarantiasTab';
import PlanilhaBaseTab from './PlanilhaBaseTab';

type TabKey =
  | 'DADOS_GERAIS'
  | 'PLANILHA_BASE'
  | 'DOCUMENTOS'
  | 'ADITIVOS'
  | 'GARANTIAS'
  | 'CRONOGRAMA'
  | 'MEDICOES'
  | 'INCONFORMIDADES'
  | 'RELATORIOS';

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: 'DADOS_GERAIS', label: 'Dados Gerais' },
  { key: 'PLANILHA_BASE', label: 'Planilha Base (BD)' },
  { key: 'DOCUMENTOS', label: 'Documentos' },
  { key: 'ADITIVOS', label: 'Aditivos' },
  { key: 'GARANTIAS', label: 'Garantias' },
  { key: 'CRONOGRAMA', label: 'Cronograma' },
  { key: 'MEDICOES', label: 'Medições' },
  { key: 'INCONFORMIDADES', label: 'Inconformidades' },
  { key: 'RELATORIOS', label: 'Relatórios' },
];

const CHECKLIST_FIELDS: Array<{ key: keyof ChecklistContrato; label: string }> = [
  { key: 'contratoAssinado', label: 'Contrato Assinado' },
  { key: 'artRrt', label: 'ART / RRT' },
  { key: 'cronograma', label: 'Cronograma Físico' },
  { key: 'garantia', label: 'Garantia Contratual' },
  { key: 'fiscalDesignado', label: 'Fiscal Designado' },
  { key: 'gestorDesignado', label: 'Gestor Designado' },
];

export default function ContratoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    db,
    toggleChecklistContrato,
    addItemContrato,
    updateItemContrato,
    deleteItemContrato,
    importPlanilhaContrato,
    updateContrato,
    deleteContrato,
    addAssinaturaEntidade,
    removeAssinaturaEntidade,
    pushToast,
  } = useFiscalStore();
  const [tab, setTab] = useState<TabKey>('DADOS_GERAIS');
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [importPlanilhaOpen, setImportPlanilhaOpen] = useState(false);

  const [editContratoOpen, setEditContratoOpen] = useState(false);
  const [ecNumero, setEcNumero] = useState('');
  const [ecProcesso, setEcProcesso] = useState('');
  const [ecObjeto, setEcObjeto] = useState('');
  const [ecContratada, setEcContratada] = useState('');
  const [ecCnpj, setEcCnpj] = useState('');
  const [ecGestor, setEcGestor] = useState('');
  const [ecFiscal, setEcFiscal] = useState('');
  const [ecValorInicial, setEcValorInicial] = useState('');
  const [ecDataInicio, setEcDataInicio] = useState('');
  const [ecDataFim, setEcDataFim] = useState('');
  const [ecStatus, setEcStatus] = useState<ContratoStatus>('ATIVO');
  const [ecMunicipio, setEcMunicipio] = useState('');
  const [ecLat, setEcLat] = useState('');
  const [ecLng, setEcLng] = useState('');

  const [itemCodigo, setItemCodigo] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [itemUnid, setItemUnid] = useState('m²');
  const [itemQtd, setItemQtd] = useState('');
  const [itemPreco, setItemPreco] = useState('');

  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [eiCodigo, setEiCodigo] = useState('');
  const [eiDesc, setEiDesc] = useState('');
  const [eiUnid, setEiUnid] = useState('');
  const [eiQtd, setEiQtd] = useState('');
  const [eiPreco, setEiPreco] = useState('');
  const [itemToDelete, setItemToDelete] = useState<ItemContrato | null>(null);

  const contrato = db.contratos.find((c) => c.id === id);
  if (!contrato) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-sm font-semibold text-slate-900">Contrato não encontrado.</p>
        <button
          type="button"
          onClick={() => navigate('/contratos')}
          className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md"
        >
          Voltar para Contratos
        </button>
      </div>
    );
  }

  const saldoInfo = calcularSaldoContrato(contrato, db.aditivos, db.medicoes);
  const checklistStatus = calcularChecklistContrato(contrato.checklist);
  const diasRestantes = calcularDiasRestantes(contrato.dataFim);
  const corVigencia = vigenciaColor(diasRestantes);
  const medicoesContrato = db.medicoes.filter((m) => m.contratoId === contrato.id);
  const ncsContrato = db.naoConformidades.filter((nc) => nc.contratoId === contrato.id);
  const itensContrato = db.itensContrato.filter((i) => i.contratoId === contrato.id);
  const etapasContrato = db.etapasCronograma.filter((e) => e.contratoId === contrato.id);
  const progressoFisico = contratoService.calcularProgressoFisico(etapasContrato);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemCodigo.trim() || !itemDesc.trim()) return;
    await addItemContrato({
      contratoId: contrato.id,
      codigo: itemCodigo.trim(),
      descricao: itemDesc.trim(),
      unidade: itemUnid.trim() || 'un',
      quantidade: Number(itemQtd) || 0,
      precoUnitario: Number(itemPreco) || 0,
    });
    setItemCodigo('');
    setItemDesc('');
    setItemQtd('');
    setItemPreco('');
  };

  const openEditContrato = () => {
    setEcNumero(contrato.numero);
    setEcProcesso(contrato.processo);
    setEcObjeto(contrato.objeto);
    setEcContratada(contrato.contratada);
    setEcCnpj(contrato.cnpj);
    setEcGestor(contrato.gestor);
    setEcFiscal(contrato.fiscal);
    setEcValorInicial(String(contrato.valorInicial));
    setEcDataInicio(contrato.dataInicio);
    setEcDataFim(contrato.dataFim);
    setEcStatus(contrato.status);
    setEcMunicipio(contrato.municipio);
    setEcLat(String(contrato.latitude));
    setEcLng(String(contrato.longitude));
    setEditContratoOpen(true);
  };

  const handleSaveEditContrato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ecNumero.trim() || !ecObjeto.trim() || !ecContratada.trim()) return;
    await updateContrato(contrato.id, {
      numero: ecNumero.trim(),
      processo: ecProcesso.trim(),
      objeto: ecObjeto.trim(),
      contratada: ecContratada.trim(),
      cnpj: ecCnpj.trim(),
      gestor: ecGestor.trim(),
      fiscal: ecFiscal.trim(),
      valorInicial: Number(ecValorInicial) || 0,
      dataInicio: ecDataInicio,
      dataFim: ecDataFim,
      status: ecStatus,
      municipio: ecMunicipio.trim(),
      latitude: Number(ecLat) || contrato.latitude,
      longitude: Number(ecLng) || contrato.longitude,
    });
    setEditContratoOpen(false);
  };

  const startEditItem = (it: ItemContrato) => {
    setEditingItemId(it.id);
    setEiCodigo(it.codigo);
    setEiDesc(it.descricao);
    setEiUnid(it.unidade);
    setEiQtd(String(it.quantidade));
    setEiPreco(String(it.precoUnitario));
  };

  const saveEditItem = async () => {
    if (!editingItemId || !eiCodigo.trim() || !eiDesc.trim()) return;
    await updateItemContrato(editingItemId, {
      codigo: eiCodigo.trim(),
      descricao: eiDesc.trim(),
      unidade: eiUnid.trim() || 'un',
      quantidade: Number(eiQtd) || 0,
      precoUnitario: Number(eiPreco) || 0,
    });
    setEditingItemId(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/contratos')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Contratos</span>
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">
              Contrato {contrato.numero}
            </h1>
            <StatusTag
              label={contrato.status}
              tone={
                contrato.status === 'ATIVO'
                  ? 'success'
                  : contrato.status === 'SUSPENSO'
                  ? 'warning'
                  : 'neutral'
              }
            />
            <StatusTag
              label={
                diasRestantes >= 0
                  ? `${diasRestantes}d de vigência`
                  : `Vencido há ${Math.abs(diasRestantes)}d`
              }
              tone={corVigencia === 'error' ? 'error' : corVigencia === 'warning' ? 'warning' : 'success'}
            />
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-4xl">{contrato.objeto}</p>
          <div className="text-xs text-slate-500 mt-1.5">
            {contrato.contratada} · CNPJ {contrato.cnpj} · Processo {contrato.processo} ·{' '}
            {contrato.municipio}
          </div>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={openEditContrato}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Edit3 className="w-4 h-4" />
            <span>Editar Contrato</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmExcluirOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>Excluir Contrato</span>
          </button>
          <button
            type="button"
            onClick={async () => {
              await gerarPdfFichaContrato({
                contrato,
                aditivos: db.aditivos.filter((a) => a.contratoId === contrato.id),
                garantias: db.garantias.filter((g) => g.contratoId === contrato.id),
                medicoes: medicoesContrato,
                ncs: ncsContrato,
                config: db.configuracoes,
              });
              pushToast('success', 'Ficha do Contrato exportada em PDF.');
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] whitespace-nowrap shrink-0"
          >
            <FileDown className="w-4 h-4" />
            <span>Gerar PDF da Ficha</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Valor Inicial" value={formatCurrencyBR(saldoInfo.valorInicial)} />
        <StatCard title="Aditivos" value={formatCurrencyBR(saldoInfo.totalAditivosValor)} />
        <StatCard
          title="Executado"
          value={formatCurrencyBR(saldoInfo.executado)}
          subtitle={`${saldoInfo.percentual.toFixed(1)}% financeiro · ${progressoFisico}% físico`}
          tone="success"
        />
        <StatCard title="Saldo" value={formatCurrencyBR(saldoInfo.saldo)} />
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto no-print">
        <div className="flex items-center gap-1 min-w-max">
          {TABS.map((t) => (
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

      {/* Tab Content */}
      {tab === 'DADOS_GERAIS' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 space-y-4">
              <h2 className="text-base font-semibold text-slate-900">
                Identificação & Responsáveis
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">Fiscal do Contrato</div>
                  <div className="font-medium text-slate-900 mt-0.5">{contrato.fiscal}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Gestor do Contrato</div>
                  <div className="font-medium text-slate-900 mt-0.5">{contrato.gestor}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Início da Vigência</div>
                  <div className="font-mono text-slate-900 mt-0.5">
                    {formatDateBR(contrato.dataInicio)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Término da Vigência</div>
                  <div className="font-mono text-slate-900 mt-0.5">
                    {formatDateBR(contrato.dataFim)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Valor Atualizado</div>
                  <div className="font-mono font-semibold text-slate-900 mt-0.5">
                    {formatCurrencyBR(contrato.valorAtual)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Coordenadas da Obra</div>
                  <div className="font-mono text-slate-900 mt-0.5">
                    {contrato.latitude}, {contrato.longitude}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Checklist Documental
                </h2>
                <StatusTag
                  label={`${checklistStatus.percentual}% · ${checklistStatus.status}`}
                  tone={
                    checklistStatus.status === 'CONFORME'
                      ? 'success'
                      : checklistStatus.status === 'ATENCAO'
                      ? 'warning'
                      : 'error'
                  }
                />
              </div>

              <div className="divide-y divide-slate-100">
                {CHECKLIST_FIELDS.map((item) => {
                  const checked = contrato.checklist[item.key];
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => toggleChecklistContrato(contrato.id, item.key)}
                      className="w-full py-2.5 flex items-center justify-between text-left hover:bg-slate-50 px-1 rounded"
                    >
                      <span className="text-sm text-slate-800">{item.label}</span>
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Planilha Orçamentária do Contrato */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-slate-900">
                Itens da Planilha Orçamentária ({itensContrato.length})
              </h2>
              <button
                type="button"
                onClick={() => setImportPlanilhaOpen(true)}
                className="no-print inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#00897B] rounded-md hover:bg-[#007367]"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Importar Planilha (XLSX / PDF)</span>
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-md">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Código</th>
                    <th className="px-3 py-2">Descrição</th>
                    <th className="px-3 py-2">Unid</th>
                    <th className="px-3 py-2 text-right">Qtd</th>
                    <th className="px-3 py-2 text-right">Preço Unit.</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right no-print">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {itensContrato.map((it) => {
                    const isEditing = editingItemId === it.id;
                    return (
                      <tr key={it.id} className="h-10">
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">
                          {isEditing ? (
                            <input
                              value={eiCodigo}
                              onChange={(e) => setEiCodigo(e.target.value)}
                              className="w-24 px-2 py-1 text-xs font-mono border border-slate-300 rounded"
                            />
                          ) : (
                            it.codigo
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-900">
                          {isEditing ? (
                            <input
                              value={eiDesc}
                              onChange={(e) => setEiDesc(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                            />
                          ) : (
                            it.descricao
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-600">
                          {isEditing ? (
                            <input
                              value={eiUnid}
                              onChange={(e) => setEiUnid(e.target.value)}
                              className="w-16 px-2 py-1 text-xs border border-slate-300 rounded"
                            />
                          ) : (
                            it.unidade
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={eiQtd}
                              onChange={(e) => setEiQtd(e.target.value)}
                              className="w-20 px-2 py-1 text-xs font-mono text-right border border-slate-300 rounded"
                            />
                          ) : (
                            it.quantidade.toLocaleString('pt-BR')
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.01"
                              value={eiPreco}
                              onChange={(e) => setEiPreco(e.target.value)}
                              className="w-24 px-2 py-1 text-xs font-mono text-right border border-slate-300 rounded"
                            />
                          ) : (
                            formatCurrencyBR(it.precoUnitario)
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold">
                          {formatCurrencyBR(
                            isEditing ? (Number(eiQtd) || 0) * (Number(eiPreco) || 0) : it.valorTotal
                          )}
                        </td>
                        <td className="px-3 py-2 text-right no-print">
                          {isEditing ? (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void saveEditItem()}
                                className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                                aria-label="Salvar item"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingItemId(null)}
                                className="p-1 text-slate-500 hover:bg-slate-100 rounded"
                                aria-label="Cancelar edição"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => startEditItem(it)}
                                className="p-1 text-slate-400 hover:text-[#004A8F] rounded"
                                aria-label="Editar item"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setItemToDelete(it)}
                                className="p-1 text-slate-400 hover:text-red-600 rounded"
                                aria-label="Excluir item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <form onSubmit={handleAddItem} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 pt-2 no-print">
              <input
                required
                value={itemCodigo}
                onChange={(e) => setItemCodigo(e.target.value)}
                placeholder="Código (01.05.001)"
                className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
              />
              <input
                required
                value={itemDesc}
                onChange={(e) => setItemDesc(e.target.value)}
                placeholder="Descrição do serviço"
                className="sm:col-span-2 px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
              <input
                required
                value={itemUnid}
                onChange={(e) => setItemUnid(e.target.value)}
                placeholder="Unid"
                className="px-3 py-1.5 text-xs border border-slate-300 rounded-md"
              />
              <div className="flex gap-2">
                <input
                  required
                  type="number"
                  step="0.01"
                  value={itemQtd}
                  onChange={(e) => setItemQtd(e.target.value)}
                  placeholder="Qtd"
                  className="w-1/2 px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                />
                <input
                  required
                  type="number"
                  step="0.01"
                  value={itemPreco}
                  onChange={(e) => setItemPreco(e.target.value)}
                  placeholder="Unit."
                  className="w-1/2 px-2 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Incluir Item</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {tab === 'PLANILHA_BASE' && <PlanilhaBaseTab contrato={contrato} />}
      {tab === 'DOCUMENTOS' && <DocumentosTab contrato={contrato} />}
      {tab === 'ADITIVOS' && <AditivosTab contrato={contrato} />}
      {tab === 'GARANTIAS' && <GarantiasTab contrato={contrato} />}
      {tab === 'CRONOGRAMA' && <CronogramaTab contrato={contrato} />}

      {tab === 'MEDICOES' && (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          <div className="p-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Medições do Contrato ({medicoesContrato.length})
            </h3>
            <button
              type="button"
              onClick={() => navigate('/medicoes')}
              className="text-xs font-medium text-[#004A8F] hover:underline"
            >
              Ir para módulo de Medições
            </button>
          </div>
          {medicoesContrato.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhuma medição lançada para este contrato.
            </div>
          ) : (
            medicoesContrato.map((m) => (
              <div
                key={m.id}
                onClick={() => navigate(`/medicoes/${m.id}`)}
                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    Boletim de Medição nº {m.numero} · Competência {m.competencia}
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    {formatDateBR(m.dataInicio)} a {formatDateBR(m.dataFim)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {m.avaliacaoDesempenho && (
                    <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                      NMA {m.avaliacaoDesempenho.nma.toFixed(2)} · MAA{' '}
                      {m.avaliacaoDesempenho.maa.toFixed(2)}
                    </span>
                  )}
                  <span className="font-mono tabular-nums text-sm font-semibold text-slate-900">
                    {formatCurrencyBR(m.valor)}
                  </span>
                  <StatusTag
                    label={m.status}
                    tone={
                      m.status === 'PAGA' || m.status === 'APROVADA'
                        ? 'success'
                        : m.status === 'REJEITADA'
                        ? 'error'
                        : 'info'
                    }
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'INCONFORMIDADES' && (
        <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
          <div className="p-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">
              Não Conformidades ({ncsContrato.length})
            </h3>
            <button
              type="button"
              onClick={() => navigate('/inconformidades')}
              className="text-xs font-medium text-[#004A8F] hover:underline"
            >
              Abrir painel de NCs
            </button>
          </div>
          {ncsContrato.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Nenhuma não conformidade registrada para este contrato.
            </div>
          ) : (
            ncsContrato.map((nc) => (
              <div
                key={nc.id}
                onClick={() => navigate(`/inconformidades/${nc.id}`)}
                className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-50"
              >
                <div>
                  <div className="text-sm font-semibold text-slate-900">
                    <span className="font-mono text-[#004A8F]">{nc.codigo}</span> · {nc.titulo}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Origem: {nc.origem} · Prazo limite: {formatDateBR(nc.dataLimite)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <StatusTag
                    label={nc.status}
                    tone={nc.status === 'ENCERRADA' ? 'success' : 'info'}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'RELATORIOS' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <h3 className="text-base font-semibold text-slate-900">
              Resumo Gerencial do Contrato {contrato.numero}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Contrato firmado com <strong>{contrato.contratada}</strong> (CNPJ {contrato.cnpj}), com
              valor atualizado de <strong>{formatCurrencyBR(saldoInfo.valorAtual)}</strong>, execução
              acumulada de <strong>{formatCurrencyBR(saldoInfo.executado)}</strong> (
              {saldoInfo.percentual.toFixed(1)}%) e saldo contratual de{' '}
              <strong>{formatCurrencyBR(saldoInfo.saldo)}</strong>. Fiscal designado:{' '}
              <strong>{contrato.fiscal}</strong>.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  await gerarPdfFichaContrato({
                    contrato,
                    aditivos: db.aditivos.filter((a) => a.contratoId === contrato.id),
                    garantias: db.garantias.filter((g) => g.contratoId === contrato.id),
                    medicoes: medicoesContrato,
                    ncs: ncsContrato,
                    config: db.configuracoes,
                  });
                  pushToast('success', 'Relatório do contrato exportado em PDF e salvo no dispositivo.');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] whitespace-nowrap shrink-0"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Baixar Relatório em PDF</span>
              </button>
              <button
                type="button"
                onClick={() => navigate('/relatorios')}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
              >
                Central de Relatórios
              </button>
            </div>
          </div>

          <AssinaturasPanel
            titulo="Campos de Assinatura Física da Ficha do Contrato"
            documentoRef={`CONTRATO-${contrato.numero}`}
            assinaturas={contrato.assinaturas ?? []}
            presets={[
              {
                label: 'Fiscal',
                nome: contrato.fiscal,
                cargo: 'Fiscal do Contrato',
                registro: db.configuracoes.creaFiscal,
              },
              {
                label: 'Gestor',
                nome: contrato.gestor,
                cargo: 'Gestor do Contrato',
              },
              {
                label: 'Contratada',
                nome: contrato.contratada,
                cargo: 'Representante da Contratada',
                registro: contrato.cnpj,
              },
            ]}
            onAdd={(sig) => addAssinaturaEntidade('CONTRATO', contrato.id, sig)}
            onRemove={(sigId) => removeAssinaturaEntidade('CONTRATO', contrato.id, sigId)}
          />
        </div>
      )}

      <ConfirmDialog
        open={confirmExcluirOpen}
        destructive
        title="Excluir Contrato"
        description={`Tem certeza que deseja excluir o Contrato ${contrato.numero} (${contrato.contratada})? Todos os aditivos, medições, diários de obra, não conformidades, documentos e processos vinculados serão removidos do dispositivo.`}
        confirmLabel="Excluir Contrato"
        onCancel={() => setConfirmExcluirOpen(false)}
        onConfirm={async () => {
          setConfirmExcluirOpen(false);
          await deleteContrato(contrato.id);
          navigate('/contratos');
        }}
      />

      <ConfirmDialog
        open={Boolean(itemToDelete)}
        destructive
        title="Excluir Item da Planilha"
        description={
          itemToDelete
            ? `Deseja remover o item ${itemToDelete.codigo} (${itemToDelete.descricao}) da planilha orçamentária?`
            : ''
        }
        confirmLabel="Excluir Item"
        onCancel={() => setItemToDelete(null)}
        onConfirm={async () => {
          if (itemToDelete) {
            await deleteItemContrato(itemToDelete.id);
          }
          setItemToDelete(null);
        }}
      />

      {editContratoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                Editar Dados do Contrato {contrato.numero}
              </h2>
              <button
                type="button"
                onClick={() => setEditContratoOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEditContrato} className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nº Contrato *</label>
                  <input
                    required
                    value={ecNumero}
                    onChange={(e) => setEcNumero(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nº Processo *</label>
                  <input
                    required
                    value={ecProcesso}
                    onChange={(e) => setEcProcesso(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select
                    value={ecStatus}
                    onChange={(e) => setEcStatus(e.target.value as ContratoStatus)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  >
                    <option value="ATIVO">ATIVO</option>
                    <option value="SUSPENSO">SUSPENSO</option>
                    <option value="ENCERRADO">ENCERRADO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Objeto *</label>
                <textarea
                  required
                  rows={2}
                  value={ecObjeto}
                  onChange={(e) => setEcObjeto(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Empresa Contratada *</label>
                  <input
                    required
                    value={ecContratada}
                    onChange={(e) => setEcContratada(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">CNPJ *</label>
                  <input
                    required
                    value={ecCnpj}
                    onChange={(e) => setEcCnpj(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Fiscal *</label>
                  <input
                    required
                    value={ecFiscal}
                    onChange={(e) => setEcFiscal(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Gestor *</label>
                  <input
                    required
                    value={ecGestor}
                    onChange={(e) => setEcGestor(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor Inicial (R$) *</label>
                  <input
                    required
                    type="number"
                    step="0.01"
                    value={ecValorInicial}
                    onChange={(e) => setEcValorInicial(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Início Vigência *</label>
                  <input
                    required
                    type="date"
                    value={ecDataInicio}
                    onChange={(e) => setEcDataInicio(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Término Vigência *</label>
                  <input
                    required
                    type="date"
                    value={ecDataFim}
                    onChange={(e) => setEcDataFim(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Município *</label>
                  <input
                    required
                    value={ecMunicipio}
                    onChange={(e) => setEcMunicipio(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={ecLat}
                    onChange={(e) => setEcLat(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={ecLng}
                    onChange={(e) => setEcLng(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditContratoOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ImportPlanilhaModal
        open={importPlanilhaOpen}
        titulo={`Importar Planilha Orçamentária — Contrato ${contrato.numero}`}
        subtitulo="Os itens importados ficarão disponíveis imediatamente nas medições do contrato para cálculo automático."
        mostrarColunaExecutada={false}
        onClose={() => setImportPlanilhaOpen(false)}
        onConfirm={async (payload) => {
          await importPlanilhaContrato({
            contratoId: contrato.id,
            ...payload,
          });
        }}
      />
    </div>
  );
}
