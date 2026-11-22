import { useState } from 'react';
import ContratoForm from './ContratoForm';
import ContratoList from './ContratoList';

export default function Contratos() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Gestão de Contratos de Obras
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Controle de vigências, aditivos, garantias, documentos obrigatórios e cronogramas.
        </p>
      </div>

      <ContratoList onNewContrato={() => setFormOpen(true)} />
      <ContratoForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
