import { useState } from 'react';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { ProcessoPagamentoGEFISPAG } from '../../types';

export default function ParecerGestorGefispag({
  processo,
}: {
  processo: ProcessoPagamentoGEFISPAG;
}) {
  const { updateProcessoGefispag, pushToast } = useFiscalStore();
  const [texto, setTexto] = useState(
    processo.parecerGestor ||
      'Regularidade contratual, certidões fiscais e documentação comprobatória conferidas. Autorizo o encaminhamento para liquidação e pagamento.'
  );

  const handleSave = async (aprovar: boolean) => {
    await updateProcessoGefispag(
      processo.id,
      {
        parecerGestor: texto.trim(),
        parecerGestorAprovado: aprovar,
      },
      `Parecer do Gestor registrado no processo ${processo.numeroProcesso}.`
    );
    pushToast('success', 'Parecer do Gestor salvo.');
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Parecer do Gestor do Contrato</h3>
        <StatusTag
          label={processo.parecerGestorAprovado ? 'Autorizado' : 'Pendente'}
          tone={processo.parecerGestorAprovado ? 'success' : 'warning'}
        />
      </div>
      <textarea
        rows={3}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
      />
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => handleSave(true)}
          className="px-4 py-1.5 text-xs font-medium text-white bg-[#00897B] rounded-md hover:bg-[#007367]"
        >
          Autorizar & Salvar Parecer Gestor
        </button>
      </div>
    </div>
  );
}
