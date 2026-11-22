import { ArrowLeft, Edit3, FileDown, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatusTag from '../../components/StatusTag';
import { gerarPdfRdo } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { StatusDiario } from '../../types';
import { formatDateBR } from '../../utils/engineering';
import AssinaturasSection from './AssinaturasSection';
import AtividadesSection from './AtividadesSection';
import ClimaSection from './ClimaSection';
import EfetivoSection from './EfetivoSection';
import EquipamentosSection from './EquipamentosSection';
import FotosSection from './FotosSection';
import OcorrenciasSection from './OcorrenciasSection';

type RdoTab = 'RESUMO' | 'CLIMA_EFETIVO' | 'ATIVIDADES' | 'OCORRENCIAS' | 'FOTOS' | 'ASSINATURAS';

export default function DiarioDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { db, updateDiario, deleteDiario, pushToast } = useFiscalStore();
  const [tab, setTab] = useState<RdoTab>('RESUMO');
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [eData, setEData] = useState('');
  const [eStatus, setEStatus] = useState<StatusDiario>('RASCUNHO');
  const [eParalisado, setEParalisado] = useState(false);
  const [eObs, setEObs] = useState('');

  const diario = db.diarios.find((d) => d.id === id);
  const contrato = diario ? db.contratos.find((c) => c.id === diario.contratoId) : undefined;

  if (!diario || !contrato) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-sm font-semibold text-slate-900">RDO não encontrado.</p>
        <button
          type="button"
          onClick={() => navigate('/diario')}
          className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md"
        >
          Voltar para Diário de Obras
        </button>
      </div>
    );
  }

  const totalEfetivo = diario.efetivo.reduce((acc, e) => acc + e.quantidade, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/diario')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-2 no-print"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Diário de Obras</span>
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              RDO {formatDateBR(diario.data)} · Contrato {contrato.numero}
            </h1>
            <StatusTag
              label={diario.status}
              tone={
                diario.status === 'ASSINADO' || diario.status === 'ARQUIVADO'
                  ? 'success'
                  : diario.status === 'FECHADO'
                  ? 'info'
                  : 'warning'
              }
            />
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {contrato.contratada} · {contrato.municipio}
          </p>
        </div>

        <div className="no-print flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setEData(diario.data);
              setEStatus(diario.status);
              setEParalisado(diario.paralisado);
              setEObs(diario.observacoes);
              setEditOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar RDO</span>
          </button>
          <button
            type="button"
            onClick={() => setConfirmExcluirOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir RDO</span>
          </button>
          <button
            type="button"
            disabled={gerandoPdf}
            onClick={async () => {
              setGerandoPdf(true);
              try {
                await gerarPdfRdo({ diario, contrato, config: db.configuracoes });
                pushToast('success', 'RDO exportado em PDF e salvo no dispositivo.');
              } finally {
                setGerandoPdf(false);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <FileDown className="w-4 h-4" />
            <span>{gerandoPdf ? 'Gerando...' : 'Baixar RDO (PDF)'}</span>
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 overflow-x-auto no-print">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { key: 'RESUMO' as const, label: 'Resumo do Dia' },
            { key: 'CLIMA_EFETIVO' as const, label: 'Clima, Efetivo & Equipamentos' },
            { key: 'ATIVIDADES' as const, label: `Atividades (${diario.atividades.length})` },
            { key: 'OCORRENCIAS' as const, label: `Ocorrências (${diario.ocorrencias.length})` },
            { key: 'FOTOS' as const, label: `Fotos & Mapa (${diario.fotos.length})` },
            { key: 'ASSINATURAS' as const, label: `Fechamento & Assinaturas (${diario.assinaturas.length})` },
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
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-slate-200 pb-4 text-sm">
            <div>
              <div className="text-xs text-slate-500">Data</div>
              <div className="font-mono font-semibold text-slate-900 mt-0.5">
                {formatDateBR(diario.data)}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Clima</div>
              <div className="font-mono font-semibold text-slate-900 mt-0.5">
                {diario.clima.temperatura}°C · {diario.clima.chuva ? 'Chuva' : 'Sem chuva'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Efetivo Total</div>
              <div className="font-mono font-semibold text-slate-900 mt-0.5">
                {totalEfetivo} trabalhadores
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Fiscal</div>
              <div className="font-medium text-slate-900 mt-0.5">{contrato.fiscal}</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Relato Técnico / Observações Gerais
            </label>
            <textarea
              rows={4}
              value={diario.observacoes}
              onChange={(e) => updateDiario(diario.id, { observacoes: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md leading-relaxed"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-2">Atividades Executadas</h4>
              {diario.atividades.length === 0 ? (
                <p className="text-xs text-slate-400">Nenhuma atividade lançada.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-slate-800">
                  {diario.atividades.map((a) => (
                    <li key={a.id} className="flex justify-between">
                      <span>
                        · {a.descricao} ({a.local})
                      </span>
                      <span className="font-mono text-xs text-slate-500">{a.percentual}%</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-600 mb-2">Ocorrências</h4>
              {diario.ocorrencias.length === 0 ? (
                <p className="text-xs text-slate-400">Sem ocorrências registradas.</p>
              ) : (
                <ul className="space-y-1.5 text-sm text-slate-800">
                  {diario.ocorrencias.map((o) => (
                    <li key={o.id}>
                      · [{o.criticidade}] {o.descricao}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'CLIMA_EFETIVO' && (
        <div className="space-y-6">
          <ClimaSection diario={diario} contrato={contrato} />
          <EfetivoSection diario={diario} />
          <EquipamentosSection diario={diario} />
        </div>
      )}

      {tab === 'ATIVIDADES' && <AtividadesSection diario={diario} />}
      {tab === 'OCORRENCIAS' && <OcorrenciasSection diario={diario} />}
      {tab === 'FOTOS' && <FotosSection diario={diario} contrato={contrato} />}
      {tab === 'ASSINATURAS' && <AssinaturasSection diario={diario} />}

      <ConfirmDialog
        open={confirmExcluirOpen}
        destructive
        title="Excluir Diário de Obra (RDO)"
        description={`Tem certeza que deseja excluir o RDO de ${formatDateBR(diario.data)} (${contrato.numero})? Todas as informações de efetivo, equipamentos, atividades, ocorrências e fotos vinculadas serão removidas.`}
        confirmLabel="Excluir RDO"
        onCancel={() => setConfirmExcluirOpen(false)}
        onConfirm={async () => {
          setConfirmExcluirOpen(false);
          await deleteDiario(diario.id);
          navigate('/diario');
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
              <h2 className="text-base font-bold text-slate-900">Editar Cabeçalho do RDO</h2>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await updateDiario(
                  diario.id,
                  {
                    data: eData,
                    status: eStatus,
                    paralisado: eParalisado,
                    observacoes: eObs,
                  },
                  `RDO de ${formatDateBR(eData)} editado.`
                );
                setEditOpen(false);
                pushToast('success', 'Dados do RDO atualizados.');
              }}
              className="space-y-4 mt-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data *</label>
                  <input
                    required
                    type="date"
                    value={eData}
                    onChange={(e) => setEData(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
                  <select
                    value={eStatus}
                    onChange={(e) => setEStatus(e.target.value as StatusDiario)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  >
                    <option value="RASCUNHO">RASCUNHO</option>
                    <option value="SALVO">SALVO</option>
                    <option value="FECHADO">FECHADO</option>
                    <option value="ASSINADO">ASSINADO</option>
                    <option value="ARQUIVADO">ARQUIVADO</option>
                  </select>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={eParalisado}
                  onChange={(e) => setEParalisado(e.target.checked)}
                  className="accent-[#004A8F]"
                />
                <span>Obra paralisada neste dia</span>
              </label>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Observações Gerais
                </label>
                <textarea
                  rows={3}
                  value={eObs}
                  onChange={(e) => setEObs(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
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
