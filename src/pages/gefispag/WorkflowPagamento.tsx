import { ArrowRight, Check } from 'lucide-react';
import { gefispagService } from '../../services/gefispag.service';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, ProcessoPagamentoGEFISPAG, StatusWorkflowGEFISPAG } from '../../types';

const ETAPAS: Array<{ key: StatusWorkflowGEFISPAG; label: string }> = [
  { key: 'AUTUACAO', label: 'Autuação' },
  { key: 'CONFERENCIA_DOCUMENTAL', label: 'Conferência Documental' },
  { key: 'PARECER_FISCAL', label: 'Parecer Fiscal' },
  { key: 'PARECER_GESTOR', label: 'Parecer Gestor' },
  { key: 'LIQUIDACAO', label: 'Liquidação' },
  { key: 'PAGO', label: 'Pago' },
];

export default function WorkflowPagamento({
  processo,
  contrato,
}: {
  processo: ProcessoPagamentoGEFISPAG;
  contrato: Contrato;
}) {
  const { db, avancarWorkflowGefispag, pushToast } = useFiscalStore();
  const currentIndex = ETAPAS.findIndex((e) => e.key === processo.statusWorkflow);
  const nextEtapa = ETAPAS[currentIndex + 1];

  const validacao = gefispagService.validarProcessoPagamento({
    processo,
    contrato,
    garantias: db.garantias,
    ncsContrato: db.naoConformidades.filter((nc) => nc.contratoId === contrato.id),
  });

  const handleAvancar = async () => {
    if (!nextEtapa) return;
    if (
      (nextEtapa.key === 'LIQUIDACAO' || nextEtapa.key === 'PAGO') &&
      !validacao.aptoParaPagamento
    ) {
      pushToast(
        'error',
        'Pendências impeditivas: verifique certidões, checklist documental, garantia ou NCs abertas antes de liquidar.'
      );
      return;
    }
    await avancarWorkflowGefispag(processo.id, nextEtapa.key);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold text-slate-900">
          Fluxo de Tramitação GEFISPAG
        </h3>
        {nextEtapa && (
          <button
            type="button"
            onClick={handleAvancar}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            <span>Avançar para {nextEtapa.label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {ETAPAS.map((etapa, idx) => {
          const done = idx < currentIndex || processo.statusWorkflow === 'PAGO';
          const active = idx === currentIndex && processo.statusWorkflow !== 'PAGO';
          return (
            <div
              key={etapa.key}
              className={`p-3 rounded-md border text-xs ${
                done
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : active
                  ? 'bg-blue-50 border-[#004A8F] text-[#004A8F] font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono">0{idx + 1}</span>
                {done && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              </div>
              <div>{etapa.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
