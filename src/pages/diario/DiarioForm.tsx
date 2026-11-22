import { X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useFiscalStore } from '../../store/useFiscalStore';

export default function DiarioForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { db, addDiario, selectedContratoId } = useFiscalStore();
  const defaultCtr =
    selectedContratoId !== 'ALL' ? selectedContratoId : db.contratos[0]?.id ?? '';

  const [contratoId, setContratoId] = useState(defaultCtr);
  const [data, setData] = useState('2026-11-21');
  const [observacoes, setObservacoes] = useState('');
  const [paralisado, setParalisado] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const contrato = db.contratos.find((c) => c.id === contratoId);
    if (!contrato) return;
    setSubmitting(true);
    try {
      let clima = {
        temperatura: 30,
        umidade: 56,
        chuva: false,
        velocidadeVento: 14,
        observacao: 'Condição climática estável.',
      };
      try {
        clima = await api.getClima(contrato.latitude, contrato.longitude);
      } catch {
        // Use default climate snapshot if unavailable
      }
      const novo = await addDiario({
        contratoId,
        data,
        clima,
        observacoes:
          observacoes.trim() ||
          'Acompanhamento técnico de campo mantendo compatibilidade com o cronograma físico.',
        paralisado,
        status: 'RASCUNHO',
        efetivo: [],
        equipamentos: [],
        atividades: [],
        ocorrencias: [],
        fotos: [],
        assinaturas: [],
      });
      onClose();
      navigate(`/diario/${novo.id}`);
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
          <h2 className="text-lg font-bold text-slate-900">Novo Relatório Diário de Obra (RDO)</h2>
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

          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Data</label>
              <input
                required
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
            <label className="flex items-center gap-2 py-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={paralisado}
                onChange={(e) => setParalisado(e.target.checked)}
                className="accent-[#004A8F]"
              />
              <span>Dia paralisado</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Observações Gerais do Dia
            </label>
            <textarea
              rows={3}
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Descreva os serviços principais e frentes de trabalho..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
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
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50"
            >
              {submitting ? 'Criando RDO...' : 'Abrir RDO'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
