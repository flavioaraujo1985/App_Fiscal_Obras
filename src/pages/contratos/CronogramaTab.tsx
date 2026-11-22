import { Check, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, EtapaCronograma } from '../../types';
import { formatDateBR } from '../../utils/engineering';

export default function CronogramaTab({ contrato }: { contrato: Contrato }) {
  const {
    db,
    addEtapaCronograma,
    updateEtapaCronograma,
    updateEtapaDetalhes,
    deleteEtapaCronograma,
  } = useFiscalStore();
  const etapas = db.etapasCronograma.filter((e) => e.contratoId === contrato.id);

  const [descricao, setDescricao] = useState('');
  const [percentual, setPercentual] = useState('10');
  const [inicio, setInicio] = useState(contrato.dataInicio);
  const [fim, setFim] = useState(contrato.dataFim);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eDesc, setEDesc] = useState('');
  const [ePerc, setEPerc] = useState('10');
  const [eInicio, setEInicio] = useState('');
  const [eFim, setEFim] = useState('');
  const [eExec, setEExec] = useState('0');
  const [etapaToDelete, setEtapaToDelete] = useState<EtapaCronograma | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return;
    await addEtapaCronograma({
      contratoId: contrato.id,
      descricao: descricao.trim(),
      percentual: Math.max(0, Math.min(100, Number(percentual) || 0)),
      inicio,
      fim,
      executado: 0,
    });
    setDescricao('');
    setPercentual('10');
  };

  const startEdit = (etp: EtapaCronograma) => {
    setEditingId(etp.id);
    setEDesc(etp.descricao);
    setEPerc(String(etp.percentual));
    setEInicio(etp.inicio);
    setEFim(etp.fim);
    setEExec(String(etp.executado));
  };

  const saveEdit = async (id: string) => {
    if (!eDesc.trim()) return;
    await updateEtapaDetalhes(id, {
      descricao: eDesc.trim(),
      percentual: Math.max(0, Math.min(100, Number(ePerc) || 0)),
      inicio: eInicio,
      fim: eFim,
      executado: Math.max(0, Math.min(100, Number(eExec) || 0)),
    });
    setEditingId(null);
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
      >
        <h3 className="text-sm font-semibold text-slate-900">Nova Etapa do Cronograma</h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Descrição da Etapa
            </label>
            <input
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Serviços Preliminares / Infraestrutura"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Peso (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step="0.1"
              value={percentual}
              onChange={(e) => setPercentual(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Início</label>
            <input
              type="date"
              value={inicio}
              onChange={(e) => setInicio(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Término</label>
            <input
              type="date"
              value={fim}
              onChange={(e) => setFim(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Etapa</span>
          </button>
        </div>
      </form>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Etapas do Cronograma Físico-Financeiro ({etapas.length})
            </h3>
            <p className="text-xs text-slate-500">
              Atualize o avanço físico percentual aferido em campo, edite metas ou remova etapas.
            </p>
          </div>
        </div>

        {etapas.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhuma etapa cadastrada para este contrato.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {etapas.map((etp) => {
              const isEditing = editingId === etp.id;
              return (
                <div key={etp.id} className="p-4 space-y-3">
                  {isEditing ? (
                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end">
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] text-slate-500 mb-1">Descrição</label>
                        <input
                          value={eDesc}
                          onChange={(e) => setEDesc(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Peso (%)</label>
                        <input
                          type="number"
                          step="0.1"
                          value={ePerc}
                          onChange={(e) => setEPerc(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Início</label>
                        <input
                          type="date"
                          value={eInicio}
                          onChange={(e) => setEInicio(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-500 mb-1">Término</label>
                        <input
                          type="date"
                          value={eFim}
                          onChange={(e) => setEFim(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void saveEdit(etp.id)}
                          className="p-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                          aria-label="Salvar etapa"
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
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">{etp.descricao}</div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          Peso na obra: {etp.percentual}% · Período: {formatDateBR(etp.inicio)} a{' '}
                          {formatDateBR(etp.fim)}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 w-full md:w-96 shrink-0">
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={etp.executado}
                          onChange={(e) => updateEtapaCronograma(etp.id, Number(e.target.value))}
                          className="flex-1 accent-[#004A8F]"
                        />
                        <span className="w-12 text-right font-mono tabular-nums text-sm font-semibold text-slate-900">
                          {etp.executado}%
                        </span>
                        <button
                          type="button"
                          onClick={() => startEdit(etp)}
                          className="p-1.5 text-slate-400 hover:text-[#004A8F] rounded"
                          aria-label="Editar etapa"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEtapaToDelete(etp)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                          aria-label="Excluir etapa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(etapaToDelete)}
        destructive
        title="Excluir Etapa do Cronograma"
        description={
          etapaToDelete
            ? `Tem certeza que deseja excluir a etapa "${etapaToDelete.descricao}" do cronograma?`
            : ''
        }
        confirmLabel="Excluir Etapa"
        onCancel={() => setEtapaToDelete(null)}
        onConfirm={async () => {
          if (etapaToDelete) {
            await deleteEtapaCronograma(etapaToDelete.id);
          }
          setEtapaToDelete(null);
        }}
      />
    </div>
  );
}
