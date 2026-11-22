import { useState } from 'react';
import MedicaoForm from './MedicaoForm';
import MedicaoList from './MedicaoList';

export default function Medicoes() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Medições de Serviços Executados
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Planilhas quantitativas, memórias de cálculo, relatório fotográfico e parecer técnico.
        </p>
      </div>

      <MedicaoList onNewMedicao={() => setFormOpen(true)} />
      <MedicaoForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
