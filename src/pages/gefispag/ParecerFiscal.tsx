import { useState } from 'react';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { ProcessoPagamentoGEFISPAG } from '../../types';

export default function ParecerFiscalGefispag({
  processo,
}: {
  processo: ProcessoPagamentoGEFISPAG;
}) {
  const { updateProcessoGefispag, pushToast } = useFiscalStore();
  const [texto, setTexto] = useState(processo.parecerFiscal);

  const handleSave = async (aprovar: boolean) => {
    await updateProcessoGefispag(
      processo.id,
      {
        parecerFiscal: texto.trim(),
        parecerFiscalAprovado: aprovar,
      },
      `Parecer do Fiscal atualizado no processo ${processo.numeroProcesso}.`
    );
    pushToast('success', 'Parecer do Fiscal salvo.');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Parecer do Fiscal</h3>
        <StatusTag
          label={processo.parecerFiscalAprovado ? 'Atestado' : 'Pendente'}
          tone={processo.parecerFiscalAprovado ? 'success' : 'warning'}
        />
      </div>
      <textarea
        rows={3}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Manifestação técnica do fiscal atestando a execução física dos serviços..."
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => handleSave(true)}
          className="px-4 py-1.5 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
        >
          Atestar & Salvar Parecer Fiscal
        </button>
      </div>
    </div>
  );
}
