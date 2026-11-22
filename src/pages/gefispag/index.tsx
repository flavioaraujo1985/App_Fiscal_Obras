import { Plus } from 'lucide-react';
import { useState } from 'react';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import { formatCurrencyBR } from '../../utils/engineering';
import ProcessoPagamento from './ProcessoPagamento';

export default function GefispagPage() {
  const { db, selectedContratoId, criarProcessoGefispag } = useFiscalStore();
  const processos = db.processosGefispag.filter(
    (p) => selectedContratoId === 'ALL' || p.contratoId === selectedContratoId
  );

  const [selectedId, setSelectedId] = useState<string>(processos[0]?.id ?? '');
  const activeProcesso =
    processos.find((p) => p.id === selectedId) ?? processos[0] ?? undefined;
  const activeContrato = activeProcesso
    ? db.contratos.find((c) => c.id === activeProcesso.contratoId)
    : undefined;

  const medicoesElegiveis = db.medicoes.filter(
    (m) =>
      m.status === 'APROVADA' &&
      !db.processosGefispag.some((p) => p.medicaoId === m.id) &&
      (selectedContratoId === 'ALL' || m.contratoId === selectedContratoId)
  );

  const [medicaoElegivelId, setMedicaoElegivelId] = useState(medicoesElegiveis[0]?.id ?? '');
  const [notaFiscal, setNotaFiscal] = useState('NF-e 000.420.001');

  const handleAutuar = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = medicaoElegivelId || medicoesElegiveis[0]?.id;
    if (!targetId) return;
    const novo = await criarProcessoGefispag(targetId, notaFiscal);
    setSelectedId(novo.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            GEFISPAG — Gestão Fiscal e Pagamentos
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Conferência documental, certidões, travas contratuais, pareceres e liquidação.
          </p>
        </div>

        {medicoesElegiveis.length > 0 && (
          <form onSubmit={handleAutuar} className="flex flex-wrap items-center gap-2 no-print">
            <select
              value={medicaoElegivelId || medicoesElegiveis[0]?.id}
              onChange={(e) => setMedicaoElegivelId(e.target.value)}
              className="px-3 py-2 text-xs bg-white border border-slate-300 rounded-md"
            >
              {medicoesElegiveis.map((m) => (
                <option key={m.id} value={m.id}>
                  Medição nº {m.numero} ({m.competencia}) — {formatCurrencyBR(m.valor)}
                </option>
              ))}
            </select>
            <input
              value={notaFiscal}
              onChange={(e) => setNotaFiscal(e.target.value)}
              placeholder="Nº NF-e"
              className="px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-md w-36"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Autuar Processo</span>
            </button>
          </form>
        )}
      </div>

      {/* Process Selector Strip */}
      {processos.length > 0 && (
        <div className="flex flex-wrap gap-2 no-print">
          {processos.map((p) => {
            const ctr = db.contratos.find((c) => c.id === p.contratoId);
            const active = activeProcesso?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedId(p.id)}
                className={`px-4 py-2.5 rounded-lg border text-left transition-colors flex items-center gap-3 ${
                  active
                    ? 'bg-white border-[#004A8F] ring-1 ring-[#004A8F]'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div className="text-xs font-mono font-semibold text-[#004A8F]">
                    {p.numeroProcesso}
                  </div>
                  <div className="text-xs text-slate-600">
                    {ctr?.numero} · {formatCurrencyBR(p.valorLiquido)} líq.
                  </div>
                </div>
                <StatusTag
                  label={p.statusWorkflow.replace('_', ' ')}
                  tone={p.statusWorkflow === 'PAGO' ? 'success' : 'info'}
                />
              </button>
            );
          })}
        </div>
      )}

      {activeProcesso && activeContrato ? (
        <ProcessoPagamento processo={activeProcesso} contrato={activeContrato} />
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-500">
          Nenhum processo GEFISPAG autuado. Aprove uma medição para encaminhá-la ao pagamento.
        </div>
      )}
    </div>
  );
}
