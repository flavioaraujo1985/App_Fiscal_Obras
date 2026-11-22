import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Medicao, ParecerFiscalMedicao } from '../../types';
import { formatDateBR } from '../../utils/engineering';

export default function ParecerFiscal({ medicao }: { medicao: Medicao }) {
  const { db, updateMedicao, pushToast } = useFiscalStore();
  const [texto, setTexto] = useState(
    medicao.parecerFiscal?.texto ??
      'Após vistoria realizada em campo foi constatada a execução dos serviços compatíveis com os quantitativos apresentados nesta medição. Recomenda-se aprovação.'
  );
  const [conclusao, setConclusao] = useState<ParecerFiscalMedicao['conclusao']>(
    medicao.parecerFiscal?.conclusao ?? 'FAVORAVEL'
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parecer: ParecerFiscalMedicao = {
      medicaoId: medicao.id,
      texto: texto.trim(),
      conclusao,
      data: new Date().toISOString().slice(0, 10),
      fiscal: db.configuracoes.fiscalPadrao,
    };
    await updateMedicao(
      medicao.id,
      { parecerFiscal: parecer },
      `Parecer técnico emitido para Medição nº ${medicao.numero}.`
    );
    pushToast('success', 'Parecer técnico do fiscal salvo.');
  };

  return (
    <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Parecer Técnico do Fiscal</h3>
          <p className="text-xs text-slate-500">
            Responsável Técnico: {db.configuracoes.fiscalPadrao} · {db.configuracoes.creaFiscal}
          </p>
        </div>
        {medicao.parecerFiscal && (
          <span className="text-xs font-mono text-slate-500">
            Última atualização: {formatDateBR(medicao.parecerFiscal.data)}
          </span>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Conclusão Técnica</label>
        <select
          value={conclusao}
          onChange={(e) => setConclusao(e.target.value as ParecerFiscalMedicao['conclusao'])}
          className="w-full sm:w-80 px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
        >
          <option value="FAVORAVEL">Favorável à Aprovação Integral</option>
          <option value="FAVORAVEL_COM_RESSALVAS">Favorável com Ressalvas</option>
          <option value="DESFAVORAVEL">Desfavorável (Devolver para Correção)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Texto do Parecer</label>
        <textarea
          required
          rows={5}
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md leading-relaxed"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
        >
          Salvar Parecer Técnico
        </button>
      </div>
    </form>
  );
}
