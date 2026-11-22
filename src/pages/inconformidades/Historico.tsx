import type { NaoConformidade } from '../../types';
import { formatDateBR } from '../../utils/engineering';

export default function HistoricoSection({ nc }: { nc: NaoConformidade }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h3 className="text-base font-semibold text-slate-900">Histórico de Tramitação</h3>
      <div className="divide-y divide-slate-100">
        {nc.historico.map((h) => (
          <div key={h.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
            <div>
              <span className="font-mono text-xs text-slate-500 mr-3">{formatDateBR(h.data)}</span>
              <span className="text-slate-900">{h.descricao}</span>
            </div>
            <span className="text-xs font-medium text-slate-500 shrink-0">{h.usuario}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
