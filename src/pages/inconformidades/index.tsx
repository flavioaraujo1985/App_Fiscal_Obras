import { useState } from 'react';
import IndicadoresNC from './Indicadores';
import NcForm from './NcForm';
import NcList from './NcList';

export default function Inconformidades() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Gestão de Não Conformidades (NC)
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Registro de desvios técnicos, notificações formais, planos de ação 5W2H e controle de score.
        </p>
      </div>

      <IndicadoresNC />
      <NcList onNewNc={() => setFormOpen(true)} />
      <NcForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
