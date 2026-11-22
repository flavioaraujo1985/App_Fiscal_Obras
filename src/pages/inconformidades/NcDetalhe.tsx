import { ArrowLeft, Edit, FileDown, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AssinaturasPanel from '../../components/AssinaturasPanel';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatusTag from '../../components/StatusTag';
import { gerarPdfNotificacaoNC } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { GravidadeNC, OrigemNC, StatusNC } from '../../types';
import { formatDateBR, prazoNcStatus } from '../../utils/engineering';
import EvidenciasSection from './Evidencias';
import HistoricoSection from './Historico';
import PlanoAcaoSection from './PlanoAcao';

export default function NcDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const {
    db,
    updateNaoConformidade,
    deleteNaoConformidade,
    updateNcStatus,
    addAssinaturaEntidade,
    removeAssinaturaEntidade,
    pushToast,
  } = useFiscalStore();
  const [tab, setTab] = useState<'NOTIFICACAO' | 'PLANO' | 'EVIDENCIAS' | 'HISTORICO'>('NOTIFICACAO');
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editOrigem, setEditOrigem] = useState<OrigemNC>('VISTORIA');
  const [editGravidade, setEditGravidade] = useState<GravidadeNC>('MEDIA');
  const [editDataLimite, setEditDataLimite] = useState('');
  const [editReincidente, setEditReincidente] = useState(false);

  const nc = db.naoConformidades.find((n) => n.id === id);
  const contrato = nc ? db.contratos.find((c) => c.id === nc.contratoId) : undefined;

  if (!nc || !contrato) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
        <p className="text-sm font-semibold text-slate-900">Não conformidade não encontrada.</p>
        <button
          type="button"
          onClick={() => navigate('/inconformidades')}
          className="mt-4 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md"
        >
          Voltar para Inconformidades
        </button>
      </div>
    );
  }

  const prazo = prazoNcStatus(nc);

  const openEditModal = () => {
    setEditTitulo(nc.titulo);
    setEditDescricao(nc.descricao);
    setEditOrigem(nc.origem);
    setEditGravidade(nc.gravidade);
    setEditDataLimite(nc.dataLimite);
    setEditReincidente(nc.reincidente);
    setEditOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitulo.trim() || !editDescricao.trim()) return;
    await updateNaoConformidade(nc.id, {
      titulo: editTitulo.trim(),
      descricao: editDescricao.trim(),
      origem: editOrigem,
      gravidade: editGravidade,
      dataLimite: editDataLimite,
      reincidente: editReincidente,
    });
    setEditOpen(false);
  };

  const avancar = async (status: StatusNC, msg: string) => {
    await updateNcStatus(nc.id, status, msg);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={() => navigate('/inconformidades')}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-2 no-print"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Não Conformidades</span>
          </button>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-mono">{nc.codigo}</h1>
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
            <StatusTag label={prazo.label} tone={prazo.tone} />
            <StatusTag
              label={nc.status.replace('_', ' ')}
              tone={nc.status === 'ENCERRADA' ? 'success' : 'info'}
            />
          </div>
          <p className="text-base font-medium text-slate-800 mt-1">{nc.titulo}</p>
          <div className="text-xs text-slate-500 mt-0.5">
            Contrato {contrato.numero} · {contrato.contratada} · Aberta em{' '}
            {formatDateBR(nc.dataRegistro)} · Limite {formatDateBR(nc.dataLimite)}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={openEditModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Editar NC</span>
          </button>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Excluir</span>
          </button>
          <button
            type="button"
            disabled={gerandoPdf}
            onClick={async () => {
              setGerandoPdf(true);
              try {
                await gerarPdfNotificacaoNC({ nc, contrato, config: db.configuracoes });
                pushToast('success', 'Notificação exportada em PDF e salva no dispositivo.');
              } finally {
                setGerandoPdf(false);
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <FileDown className="w-4 h-4" />
            <span>{gerandoPdf ? 'Gerando...' : 'Baixar Notificação (PDF)'}</span>
          </button>
        </div>
      </div>

      {/* Workflow buttons */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3 no-print">
        <div className="text-xs font-medium text-slate-600">
          Fluxo: ABERTA → EM TRATAMENTO → CORRIGIDA → VALIDADA → ENCERRADA
        </div>
        <div className="flex flex-wrap gap-2">
          {nc.status === 'ABERTA' && (
            <button
              type="button"
              onClick={() =>
                avancar('EM_TRATAMENTO', 'Notificação formal emitida à contratada.')
              }
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
            >
              Emitir Notificação (Em Tratamento)
            </button>
          )}
          {(nc.status === 'ABERTA' || nc.status === 'EM_TRATAMENTO') && (
            <button
              type="button"
              onClick={() =>
                avancar('CORRIGIDA', 'Contratada informou conclusão da correção em campo.')
              }
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#00897B] rounded-md hover:bg-[#007367]"
            >
              Informar Correção
            </button>
          )}
          {nc.status === 'CORRIGIDA' && (
            <button
              type="button"
              onClick={() =>
                avancar('VALIDADA', 'Fiscal vistoriou e validou a correção executada.')
              }
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded-md hover:bg-emerald-800"
            >
              Validar Correção
            </button>
          )}
          {(nc.status === 'VALIDADA' || nc.status === 'CORRIGIDA') && (
            <button
              type="button"
              onClick={() => avancar('ENCERRADA', 'Não conformidade encerrada formalmente.')}
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-800 rounded-md hover:bg-emerald-900"
            >
              Encerrar NC
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 overflow-x-auto no-print">
        <div className="flex items-center gap-1 min-w-max">
          {[
            { key: 'NOTIFICACAO' as const, label: 'Notificação Formal' },
            { key: 'PLANO' as const, label: 'Plano de Ação (5W2H)' },
            { key: 'EVIDENCIAS' as const, label: `Evidências (${nc.evidencias.length})` },
            { key: 'HISTORICO' as const, label: `Histórico (${nc.historico.length})` },
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

      {tab === 'NOTIFICACAO' && (
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
            <div className="border-b border-slate-200 pb-3">
              <div className="text-xs font-mono font-semibold text-[#004A8F]">
                NOTIFICAÇÃO DE NÃO CONFORMIDADE · {nc.codigo}
              </div>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{nc.titulo}</h2>
            </div>

            <p className="text-sm text-slate-700 leading-relaxed">
              À <strong>{contrato.contratada}</strong> (CNPJ {contrato.cnpj}), referente ao{' '}
              <strong>Contrato nº {contrato.numero}</strong>:
            </p>

            <p className="text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-md p-4 leading-relaxed">
              Foi constatada durante fiscalização em campo a seguinte não conformidade:{' '}
              <strong>{nc.descricao}</strong>
            </p>

            <p className="text-sm text-slate-700 leading-relaxed">
              Solicitamos providências corretivas imediatas e apresentação das evidências comprobatórias
              até o prazo estabelecido em <strong>{formatDateBR(nc.dataLimite)}</strong>, sob pena de
              bloqueio de medição/pagamento e aplicação das sanções contratuais cabíveis.
            </p>

            <div className="pt-4 border-t border-slate-200 text-xs text-slate-600">
              <div className="font-semibold text-slate-900">{contrato.fiscal}</div>
              <div>Fiscal do Contrato · {db.configuracoes.creaFiscal}</div>
            </div>
          </div>

          <AssinaturasPanel
            titulo="Campos de Assinatura Física da Notificação"
            documentoRef={`NC-${nc.codigo}`}
            assinaturas={nc.assinaturas ?? []}
            presets={[
              {
                label: 'Fiscal',
                nome: contrato.fiscal,
                cargo: 'Fiscal do Contrato',
                registro: db.configuracoes.creaFiscal,
              },
              {
                label: 'Contratada (Ciência)',
                nome: contrato.contratada,
                cargo: 'Representante da Contratada',
                registro: contrato.cnpj,
              },
            ]}
            onAdd={(sig) => addAssinaturaEntidade('NC', nc.id, sig)}
            onRemove={(sigId) => removeAssinaturaEntidade('NC', nc.id, sigId)}
          />
        </div>
      )}

      {tab === 'PLANO' && <PlanoAcaoSection nc={nc} />}
      {tab === 'EVIDENCIAS' && <EvidenciasSection nc={nc} />}
      {tab === 'HISTORICO' && <HistoricoSection nc={nc} />}

      {editOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 no-print"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSaveEdit}
            className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 shadow-lg space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-semibold text-slate-900">
                Editar Não Conformidade ({nc.codigo})
              </h3>
              <button
                type="button"
                onClick={() => setEditOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
                <input
                  required
                  value={editTitulo}
                  onChange={(e) => setEditTitulo(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Origem</label>
                  <select
                    value={editOrigem}
                    onChange={(e) => setEditOrigem(e.target.value as OrigemNC)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  >
                    {(['RDO', 'MEDICAO', 'AUDITORIA', 'VISTORIA', 'SEGURANCA', 'AMBIENTAL', 'DENUNCIA'] as const).map(
                      (o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      )
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Gravidade</label>
                  <select
                    value={editGravidade}
                    onChange={(e) => setEditGravidade(e.target.value as GravidadeNC)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
                  >
                    {(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Data Limite</label>
                  <input
                    required
                    type="date"
                    value={editDataLimite}
                    onChange={(e) => setEditDataLimite(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Descrição *</label>
                <textarea
                  required
                  rows={3}
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editReincidente}
                  onChange={(e) => setEditReincidente(e.target.checked)}
                />
                <span>Ocorrência reincidente</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
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
      )}

      <ConfirmDialog
        open={deleteOpen}
        destructive
        title="Excluir Não Conformidade"
        description={`Deseja excluir permanentemente a Não Conformidade "${nc.codigo} — ${nc.titulo}" e suas evidências anexadas?`}
        confirmLabel="Excluir NC"
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          setDeleteOpen(false);
          await deleteNaoConformidade(nc.id);
          navigate('/inconformidades');
        }}
      />
    </div>
  );
}
