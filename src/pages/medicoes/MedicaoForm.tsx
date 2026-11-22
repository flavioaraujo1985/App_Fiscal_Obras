import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFiscalStore } from '../../store/useFiscalStore';
import { podeMedir } from '../../utils/engineering';

interface MedicaoFormProps {
  open: boolean;
  onClose: () => void;
}

export default function MedicaoForm({ open, onClose }: MedicaoFormProps) {
  const navigate = useNavigate();
  const { db, addMedicao, selectedContratoId } = useFiscalStore();

  const defaultCtr =
    selectedContratoId !== 'ALL' ? selectedContratoId : db.contratos[0]?.id ?? '';
  const [contratoId, setContratoId] = useState(defaultCtr);
  const [competencia, setCompetencia] = useState('11/2026');
  const [dataInicio, setDataInicio] = useState('2026-11-01');
  const [dataFim, setDataFim] = useState('2026-11-30');
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const ncsContrato = db.naoConformidades.filter((nc) => nc.contratoId === contratoId);
  const permitido = podeMedir(ncsContrato);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contratoId || !permitido) return;
    setSubmitting(true);
    try {
      const nova = await addMedicao({ contratoId, competencia, dataInicio, dataFim });
      onClose();
      navigate(`/medicoes/${nova.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Novo Boletim de Medição</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Contrato</label>
            <select
              required
              value={contratoId}
              onChange={(e) => setContratoId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
            >
              {db.contratos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.numero} — {c.contratada}
                </option>
              ))}
            </select>
          </div>

          {!permitido && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-start gap-2.5 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                Existe Não Conformidade <strong>CRÍTICA</strong> aberta para este contrato.
                Encerre a NC crítica antes de abrir nova medição.
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Competência</label>
              <input
                required
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
                placeholder="MM/AAAA"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Início</label>
              <input
                required
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Término</label>
              <input
                required
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!permitido || submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-40"
            >
              {submitting ? 'Gerando...' : 'Gerar Boletim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
