import { AlertTriangle, Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Criticidade, DiarioObra, Ocorrencia, TipoOcorrencia } from '../../types';

export default function OcorrenciasSection({ diario }: { diario: DiarioObra }) {
  const { addOcorrenciaDiario, updateDiario, pushToast } = useFiscalStore();
  const [tipo, setTipo] = useState<TipoOcorrencia>('SEGURANCA');
  const [criticidade, setCriticidade] = useState<Criticidade>('MEDIA');
  const [descricao, setDescricao] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eTipo, setETipo] = useState<TipoOcorrencia>('SEGURANCA');
  const [eCrit, setECrit] = useState<Criticidade>('MEDIA');
  const [eDesc, setEDesc] = useState('');
  const [ocToDelete, setOcToDelete] = useState<Ocorrencia | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return;
    await addOcorrenciaDiario(diario.id, {
      tipo,
      criticidade,
      descricao: descricao.trim(),
    });
    setDescricao('');
  };

  const startEdit = (oc: Ocorrencia) => {
    setEditingId(oc.id);
    setETipo(oc.tipo);
    setECrit(oc.criticidade);
    setEDesc(oc.descricao);
  };

  const saveEdit = async (id: string) => {
    if (!eDesc.trim()) return;
    await updateDiario(diario.id, {
      ocorrencias: diario.ocorrencias.map((oc) =>
        oc.id === id
          ? { ...oc, tipo: eTipo, criticidade: eCrit, descricao: eDesc.trim() }
          : oc
      ),
    });
    setEditingId(null);
    pushToast('success', 'Ocorrência atualizada.');
  };

  const handleRemove = async (id: string) => {
    await updateDiario(diario.id, {
      ocorrencias: diario.ocorrencias.filter((oc) => oc.id !== id),
    });
    pushToast('info', 'Ocorrência excluída do RDO.');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-slate-900">
          Ocorrências de Campo ({diario.ocorrencias.length})
        </h3>
        <span className="text-xs text-slate-500">
          Ocorrências de criticidade ALTA ou CRÍTICA abrem Não Conformidade automaticamente.
        </span>
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoOcorrencia)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
          >
            <option value="QUALIDADE">Qualidade</option>
            <option value="PRAZO">Prazo</option>
            <option value="SEGURANCA">Segurança</option>
            <option value="AMBIENTAL">Ambiental</option>
            <option value="CONTRATUAL">Contratual</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Criticidade</label>
          <select
            value={criticidade}
            onChange={(e) => setCriticidade(e.target.value as Criticidade)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
          >
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta (Gera NC)</option>
            <option value="CRITICA">Crítica (Gera NC)</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-slate-500 mb-1">Descrição</label>
          <input
            required
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Descreva a ocorrência verificada em obra..."
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar</span>
        </button>
      </form>

      <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
        {diario.ocorrencias.length === 0 ? (
          <div className="p-4 text-sm text-slate-500 text-center">
            Nenhuma ocorrência registrada neste RDO.
          </div>
        ) : (
          diario.ocorrencias.map((oc) => {
            const isEditing = editingId === oc.id;
            return (
              <div key={oc.id} className="p-3.5">
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
                    <select
                      value={eTipo}
                      onChange={(e) => setETipo(e.target.value as TipoOcorrencia)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    >
                      <option value="QUALIDADE">Qualidade</option>
                      <option value="PRAZO">Prazo</option>
                      <option value="SEGURANCA">Segurança</option>
                      <option value="AMBIENTAL">Ambiental</option>
                      <option value="CONTRATUAL">Contratual</option>
                    </select>
                    <select
                      value={eCrit}
                      onChange={(e) => setECrit(e.target.value as Criticidade)}
                      className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                    >
                      <option value="BAIXA">Baixa</option>
                      <option value="MEDIA">Média</option>
                      <option value="ALTA">Alta</option>
                      <option value="CRITICA">Crítica</option>
                    </select>
                    <input
                      value={eDesc}
                      onChange={(e) => setEDesc(e.target.value)}
                      className="sm:col-span-2 px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                    />
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => void saveEdit(oc.id)}
                        className="p-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                        aria-label="Salvar ocorrência"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-500 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"
                        aria-label="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <div className="text-sm text-slate-900">{oc.descricao}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Tipo: {oc.tipo}
                          {oc.ncGeradaId && (
                            <>
                              {' · '}
                              <Link
                                to={`/inconformidades/${oc.ncGeradaId}`}
                                className="text-[#004A8F] font-medium hover:underline"
                              >
                                Ver NC gerada
                              </Link>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusTag
                        label={oc.criticidade}
                        tone={
                          oc.criticidade === 'CRITICA' || oc.criticidade === 'ALTA'
                            ? 'error'
                            : oc.criticidade === 'MEDIA'
                            ? 'warning'
                            : 'neutral'
                        }
                      />
                      <button
                        type="button"
                        onClick={() => startEdit(oc)}
                        className="p-1 text-slate-400 hover:text-[#004A8F] rounded"
                        aria-label="Editar ocorrência"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setOcToDelete(oc)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded"
                        aria-label="Excluir ocorrência"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={Boolean(ocToDelete)}
        destructive
        title="Excluir Ocorrência"
        description={
          ocToDelete
            ? `Tem certeza que deseja excluir a ocorrência "${ocToDelete.descricao}" deste RDO?`
            : ''
        }
        confirmLabel="Excluir Ocorrência"
        onCancel={() => setOcToDelete(null)}
        onConfirm={async () => {
          if (ocToDelete) {
            await handleRemove(ocToDelete.id);
          }
          setOcToDelete(null);
        }}
      />
    </div>
  );
}
