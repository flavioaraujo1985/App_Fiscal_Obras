import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { NaoConformidade, PlanoAcao } from '../../types';

export default function PlanoAcaoSection({ nc }: { nc: NaoConformidade }) {
  const { saveNcPlanoAcao } = useFiscalStore();
  const [plano, setPlano] = useState<PlanoAcao>(
    nc.planoAcao ?? {
      what: '',
      why: '',
      where: '',
      when: '',
      who: '',
      how: '',
      howMuch: '',
    }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveNcPlanoAcao(nc.id, plano);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-slate-900">Plano de Ação Corretiva (5W2H)</h3>
        <p className="text-xs text-slate-500">
          Defina as ações necessárias para eliminação da causa raiz e correção da inconformidade.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'what' as const, label: 'What (O que será feito?)' },
          { key: 'why' as const, label: 'Why (Por que será feito?)' },
          { key: 'where' as const, label: 'Where (Onde será executado?)' },
          { key: 'when' as const, label: 'When (Quando / Prazo?)' },
          { key: 'who' as const, label: 'Who (Quem é o responsável?)' },
          { key: 'how' as const, label: 'How (Como será executado?)' },
          { key: 'howMuch' as const, label: 'How Much (Custo estimado / Custeio)' },
        ].map((field) => (
          <div key={field.key} className={field.key === 'howMuch' ? 'md:col-span-2' : ''}>
            <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
            <input
              required
              value={plano[field.key]}
              onChange={(e) => setPlano({ ...plano, [field.key]: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
        >
          Salvar Plano de Ação
        </button>
      </div>
    </form>
  );
}
