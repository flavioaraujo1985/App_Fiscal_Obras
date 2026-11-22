import { CheckCircle2, Plus, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Assinatura, DiarioObra } from '../../types';

export default function AssinaturasSection({ diario }: { diario: DiarioObra }) {
  const { db, updateDiario, pushToast } = useFiscalStore();
  const [nome, setNome] = useState(db.configuracoes.fiscalPadrao);
  const [cargo, setCargo] = useState<Assinatura['cargo']>('Fiscal');
  const [registro, setRegistro] = useState(db.configuracoes.creaFiscal);

  const temAtividades = diario.atividades.length > 0;
  const temEfetivo = diario.efetivo.length > 0;
  const temFotos = diario.fotos.length > 0;

  const handleIncluirCampo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    const nova: Assinatura = {
      id: `as-${Date.now()}`,
      nome: nome.trim(),
      cargo,
      registro: registro.trim() || undefined,
      dataHora: new Date().toISOString(),
      certificado: false,
    };
    const assinaturas = [...diario.assinaturas, nova];
    await updateDiario(
      diario.id,
      { assinaturas },
      `Campo de assinatura adicionado no RDO: ${nova.nome} (${nova.cargo}).`
    );
    pushToast('success', 'Campo de assinatura física incluído no RDO.');
  };

  const handleRemoverCampo = async (sigId: string) => {
    const assinaturas = diario.assinaturas.filter((a) => a.id !== sigId);
    await updateDiario(diario.id, { assinaturas });
    pushToast('info', 'Campo de assinatura removido.');
  };

  const avancarStatus = async (status: DiarioObra['status']) => {
    if ((status === 'FECHADO' || status === 'ASSINADO') && !temAtividades) {
      pushToast('error', 'Atividades obrigatórias: informe os serviços executados antes de fechar.');
      return;
    }
    await updateDiario(diario.id, { status }, `RDO alterado para ${status}.`);
    pushToast('success', `RDO atualizado para ${status}.`);
  };

  return (
    <div className="space-y-6">
      {/* Verification checklist */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <h3 className="text-base font-semibold text-slate-900">
          Verificações de Fechamento & Workflow
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {[
            { ok: temAtividades, label: 'Atividades Executadas Registradas' },
            { ok: temEfetivo, label: 'Efetivo de Obra Preenchido' },
            { ok: temFotos, label: 'Registro Fotográfico Anexado' },
          ].map((c) => (
            <div
              key={c.label}
              className={`p-3 rounded-md border flex items-center gap-2 ${
                c.ok
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50/60 border-amber-200 text-amber-900'
              }`}
            >
              {c.ok ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span className="font-medium">{c.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {(['RASCUNHO', 'SALVO', 'FECHADO', 'ASSINADO', 'ARQUIVADO'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => avancarStatus(st)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                diario.status === st
                  ? 'bg-[#004A8F] text-white border-[#004A8F]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Physical signature fields */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Campos de Assinatura Física no RDO
          </h3>
          <p className="text-xs text-slate-500">
            Os nomes e descrições abaixo aparecem no PDF do RDO com linha em branco para assinatura física.
          </p>
        </div>

        <form onSubmit={handleIncluirCampo} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Nome Completo</label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Descrição / Cargo</label>
            <select
              value={cargo}
              onChange={(e) => setCargo(e.target.value as Assinatura['cargo'])}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
            >
              <option value="Fiscal">Fiscal</option>
              <option value="Engenheiro Residente">Engenheiro Residente</option>
              <option value="Representante da Contratada">Representante da Contratada</option>
              <option value="Gestor">Gestor</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">CREA / Registro</label>
            <input
              value={registro}
              onChange={(e) => setRegistro(e.target.value)}
              placeholder="CREA / Matrícula"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Incluir Campo</span>
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {diario.assinaturas.length === 0 ? (
            <div className="sm:col-span-2 p-4 border border-slate-200 rounded-md text-sm text-slate-500 text-center">
              Nenhum signatário adicionado — o PDF exibirá os campos padrão (Fiscal e Contratada) para assinatura física.
            </div>
          ) : (
            diario.assinaturas.map((a) => (
              <div
                key={a.id}
                className="p-4 border border-slate-200 rounded-md bg-slate-50/60 flex items-end justify-between gap-3"
              >
                <div className="flex-1 pt-5">
                  <div className="border-t border-slate-400 pt-1.5">
                    <div className="text-sm font-semibold text-slate-900">{a.nome}</div>
                    <div className="text-xs text-slate-600">
                      {a.cargo}
                      {a.registro ? ` · ${a.registro}` : ''}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoverCampo(a.id)}
                  className="p-1 text-slate-400 hover:text-red-600 rounded shrink-0"
                  aria-label="Remover campo de assinatura"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
