import { PenLine, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { AssinaturaEletronica } from '../types';

interface SignerPreset {
  label: string;
  nome: string;
  cargo: string;
  registro?: string;
}

interface AssinaturasPanelProps {
  titulo?: string;
  documentoRef: string;
  assinaturas: AssinaturaEletronica[];
  presets?: SignerPreset[];
  onAdd: (assinatura: AssinaturaEletronica) => Promise<void>;
  onRemove?: (assinaturaId: string) => Promise<void>;
}

export default function AssinaturasPanel({
  titulo = 'Campos de Assinatura Física no Relatório',
  assinaturas,
  presets = [],
  onAdd,
  onRemove,
}: AssinaturasPanelProps) {
  const firstPreset = presets[0];
  const [nome, setNome] = useState(firstPreset?.nome ?? '');
  const [cargo, setCargo] = useState(firstPreset?.cargo ?? 'Fiscal do Contrato');
  const [registro, setRegistro] = useState(firstPreset?.registro ?? '');
  const [saving, setSaving] = useState(false);

  const applyPreset = (p: SignerPreset) => {
    setNome(p.nome);
    setCargo(p.cargo);
    setRegistro(p.registro ?? '');
  };

  const handleAddField = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim() || !cargo.trim()) return;
    setSaving(true);
    try {
      await onAdd({
        id: `sig-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        nome: nome.trim(),
        cargo: cargo.trim(),
        registro: registro.trim() || undefined,
        dataHora: new Date().toISOString(),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 no-print">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-[#004A8F]" />
          <div>
            <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
            <p className="text-xs text-slate-500">
              Defina os signatários exibidos no rodapé do PDF com linha em branco e descrição para assinatura física.
            </p>
          </div>
        </div>
        <span className="font-mono text-xs text-slate-500">
          {assinaturas.length} campo(s) definido(s)
        </span>
      </div>

      {presets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500">Preenchimento rápido:</span>
          {presets.map((p) => (
            <button
              key={`${p.label}-${p.nome}`}
              type="button"
              onClick={() => applyPreset(p)}
              className="px-2.5 py-1 text-xs font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 whitespace-nowrap shrink-0"
            >
              {p.label} ({p.nome})
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleAddField} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Nome Completo *
          </label>
          <input
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do responsável"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Descrição / Cargo *
          </label>
          <input
            required
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            placeholder="Ex: Fiscal do Contrato"
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            CREA / CAU / Matrícula / CNPJ
          </label>
          <input
            value={registro}
            onChange={(e) => setRegistro(e.target.value)}
            placeholder="Opcional"
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{saving ? 'Incluindo...' : 'Incluir Campo'}</span>
        </button>
      </form>

      {assinaturas.length === 0 ? (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600">
          Nenhum signatário personalizado adicionado — o PDF incluirá automaticamente os campos padrão do contrato (Fiscal, Gestor e Contratada) para assinatura física.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {assinaturas.map((sig) => (
            <div
              key={sig.id}
              className="p-4 border border-slate-200 rounded-md bg-slate-50/60 flex items-end justify-between gap-3"
            >
              <div className="flex-1 pt-5">
                <div className="border-t border-slate-400 pt-1.5">
                  <div className="text-xs font-semibold text-slate-900">{sig.nome}</div>
                  <div className="text-xs text-slate-600">
                    {sig.cargo}
                    {sig.registro ? ` · ${sig.registro}` : ''}
                  </div>
                </div>
              </div>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => void onRemove(sig.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded shrink-0"
                  aria-label="Remover campo de assinatura"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
