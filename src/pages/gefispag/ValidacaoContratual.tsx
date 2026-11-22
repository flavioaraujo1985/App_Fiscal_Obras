import { CheckCircle2, XCircle } from 'lucide-react';
import { gefispagService } from '../../services/gefispag.service';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, ProcessoPagamentoGEFISPAG } from '../../types';

export default function ValidacaoContratual({
  processo,
  contrato,
}: {
  processo: ProcessoPagamentoGEFISPAG;
  contrato: Contrato;
}) {
  const { db } = useFiscalStore();
  const ncsContrato = db.naoConformidades.filter((nc) => nc.contratoId === contrato.id);

  const res = gefispagService.validarProcessoPagamento({
    processo,
    contrato,
    garantias: db.garantias,
    ncsContrato,
  });

  const checks = [
    { ok: res.certidoesValidas, label: 'Certidões Fiscais e Trabalhistas Regulares' },
    { ok: res.vigenciaValida, label: 'Contrato Dentro do Prazo de Vigência' },
    { ok: res.garantiaValida, label: 'Garantia Contratual Ativa e Válida' },
    { ok: res.checklistCompleto, label: 'Checklist Documental Obrigatório Completo' },
    {
      ok: res.inconformidadesBloqueantes.length === 0,
      label:
        res.inconformidadesBloqueantes.length === 0
          ? 'Sem Inconformidades Médias/Altas/Críticas Pendentes'
          : `${res.inconformidadesBloqueantes.length} NC(s) pendente(s) bloqueando liquidação`,
    },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">
          Validação Contratual Automática (Trava de Pagamento)
        </h3>
        <span
          className={`text-xs font-semibold ${
            res.aptoParaPagamento ? 'text-emerald-700' : 'text-red-700'
          }`}
        >
          {res.aptoParaPagamento ? 'Apto para Liquidação' : 'Pendências Impeditivas'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {checks.map((c) => (
          <div
            key={c.label}
            className={`p-3 rounded-md border flex items-center gap-2.5 text-xs ${
              c.ok
                ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                : 'bg-red-50/60 border-red-200 text-red-900'
            }`}
          >
            {c.ok ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <XCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="font-medium">{c.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
