import { X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { GravidadeNC, OrigemNC } from '../../types';
import { calcularPrazo } from '../../utils/engineering';

export default function NcForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { db, addNaoConformidade, selectedContratoId } = useFiscalStore();
  const defaultCtr =
    selectedContratoId !== 'ALL' ? selectedContratoId : db.contratos[0]?.id ?? '';

  const [contratoId, setContratoId] = useState(defaultCtr);
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [origem, setOrigem] = useState<OrigemNC>('VISTORIA');
  const [gravidade, setGravidade] = useState<GravidadeNC>('MEDIA');
  const [reincidente, setReincidente] = useState(false);

  if (!open) return null;

  const diasPrazo = db.configuracoes.prazosNC[gravidade] ?? calcularPrazo(gravidade);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim() || !descricao.trim()) return;
    const nova = await addNaoConformidade({
      contratoId,
      titulo: titulo.trim(),
      descricao: descricao.trim(),
      origem,
      gravidade,
      reincidente,
    });
    setTitulo('');
    setDescricao('');
    onClose();
    navigate(`/inconformidades/${nova.id}`);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-xl w-full p-6 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Registrar Não Conformidade</h2>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contrato</label>
              <select
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
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Origem</label>
              <select
                value={origem}
                onChange={(e) => setOrigem(e.target.value as OrigemNC)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
              >
                {(['VISTORIA', 'RDO', 'MEDICAO', 'AUDITORIA', 'SEGURANCA', 'AMBIENTAL', 'DENUNCIA'] as const).map(
                  (o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Gravidade (Prazo automático: {diasPrazo} dias)
              </label>
              <select
                value={gravidade}
                onChange={(e) => setGravidade(e.target.value as GravidadeNC)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
              >
                <option value="BAIXA">BAIXA (15 dias)</option>
                <option value="MEDIA">MEDIA (10 dias)</option>
                <option value="ALTA">ALTA (5 dias)</option>
                <option value="CRITICA">CRITICA (2 dias — Bloqueia Medição)</option>
              </select>
            </div>
            <label className="flex items-center gap-2 py-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={reincidente}
                onChange={(e) => setReincidente(e.target.checked)}
                className="accent-[#004A8F]"
              />
              <span>Ocorrência reincidente</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Título *</label>
            <input
              required
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ex: Escavação sem escoramento lateral"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Descrição Técnica *
            </label>
            <textarea
              required
              rows={4}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Detalhe a desconformidade verificada com o projeto executivo ou normas técnicas..."
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
              className="px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
            >
              Abrir Não Conformidade
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
