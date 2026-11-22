import { useState } from 'react';
import DiarioForm from './DiarioForm';
import DiarioList from './DiarioList';

export default function DiarioObras() {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Diário de Obras (RDO)
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Registro diário de condições climáticas, efetivo, equipamentos, atividades e ocorrências.
        </p>
      </div>

      <DiarioList onNewDiario={() => setFormOpen(true)} />
      <DiarioForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
