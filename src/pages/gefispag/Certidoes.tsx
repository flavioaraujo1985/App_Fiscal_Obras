import { Check, Edit, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import StatusTag from '../../components/StatusTag';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { CertidaoFiscal, ProcessoPagamentoGEFISPAG } from '../../types';
import { calcularDiasRestantes, formatDateBR } from '../../utils/engineering';

export default function Certidoes({ processo }: { processo: ProcessoPagamentoGEFISPAG }) {
  const { updateProcessoGefispag } = useFiscalStore();
  const [nome, setNome] = useState('');
  const [orgao, setOrgao] = useState('');
  const [codigo, setCodigo] = useState('');
  const [validade, setValidade] = useState('2027-01-30');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editOrgao, setEditOrgao] = useState('');
  const [editCodigo, setEditCodigo] = useState('');
  const [editValidade, setEditValidade] = useState('');
  const [editRegular, setEditRegular] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState<CertidaoFiscal | null>(null);

  const toggleRegular = async (certId: string) => {
    const certidoes = processo.certidoes.map((c) =>
      c.id === certId ? { ...c, regular: !c.regular } : c
    );
    await updateProcessoGefispag(processo.id, { certidoes });
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    const nova: CertidaoFiscal = {
      id: `cert-${Date.now()}`,
      nome: nome.trim(),
      orgao: orgao.trim() || 'Órgão Emissor',
      codigoAutenticacao: codigo.trim() || 'AUTH-2026',
      validade,
      regular: true,
    };
    await updateProcessoGefispag(processo.id, {
      certidoes: [...processo.certidoes, nova],
    });
    setNome('');
    setOrgao('');
    setCodigo('');
  };

  const startEdit = (c: CertidaoFiscal) => {
    setEditingId(c.id);
    setEditNome(c.nome);
    setEditOrgao(c.orgao);
    setEditCodigo(c.codigoAutenticacao);
    setEditValidade(c.validade);
    setEditRegular(c.regular);
  };

  const handleSaveEdit = async (certId: string) => {
    if (!editNome.trim()) return;
    const certidoes = processo.certidoes.map((c) =>
      c.id === certId
        ? {
            ...c,
            nome: editNome.trim(),
            orgao: editOrgao.trim() || 'Órgão Emissor',
            codigoAutenticacao: editCodigo.trim() || 'AUTH-2026',
            validade: editValidade,
            regular: editRegular,
          }
        : c
    );
    await updateProcessoGefispag(processo.id, { certidoes });
    setEditingId(null);
  };

  const handleDelete = async (certId: string) => {
    const certidoes = processo.certidoes.filter((c) => c.id !== certId);
    await updateProcessoGefispag(processo.id, { certidoes });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <h3 className="text-base font-semibold text-slate-900">
        Certidões de Regularidade Fiscal & Trabalhista
      </h3>

      <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
        {processo.certidoes.map((c) => {
          const dias = calcularDiasRestantes(c.validade);
          const valida = c.regular && dias >= 0;
          const isEditing = editingId === c.id;

          if (isEditing) {
            return (
              <div key={c.id} className="p-3.5 bg-slate-50 space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={editNome}
                    onChange={(e) => setEditNome(e.target.value)}
                    placeholder="Nome da certidão *"
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                  <input
                    value={editOrgao}
                    onChange={(e) => setEditOrgao(e.target.value)}
                    placeholder="Órgão emissor"
                    className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                  />
                  <input
                    value={editCodigo}
                    onChange={(e) => setEditCodigo(e.target.value)}
                    placeholder="Cód. autenticação"
                    className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                  />
                  <input
                    type="date"
                    value={editValidade}
                    onChange={(e) => setEditValidade(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded bg-white"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editRegular}
                      onChange={(e) => setEditRegular(e.target.checked)}
                    />
                    <span>Situação regular</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-slate-700 bg-white border border-slate-300 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Cancelar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSaveEdit(c.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs text-white bg-[#004A8F] rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Salvar</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }

          return (
            <div key={c.id} className="p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-slate-900">{c.nome}</div>
                <div className="text-xs text-slate-500 font-mono">
                  {c.orgao} · Cód: {c.codigoAutenticacao} · Validade: {formatDateBR(c.validade)}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => void toggleRegular(c.id)}>
                  <StatusTag
                    label={valida ? `Regular (${dias}d)` : 'Irregular / Vencida'}
                    tone={valida ? 'success' : 'error'}
                  />
                </button>
                <button
                  type="button"
                  onClick={() => startEdit(c)}
                  className="p-1 text-slate-400 hover:text-[#004A8F] hover:bg-slate-100 rounded no-print"
                  title="Editar certidão"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(c)}
                  className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded no-print"
                  title="Excluir certidão"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 pt-2 no-print">
        <input
          required
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Certidão (ex: CND Municipal)"
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-md"
        />
        <input
          value={orgao}
          onChange={(e) => setOrgao(e.target.value)}
          placeholder="Órgão emissor"
          className="px-3 py-1.5 text-xs border border-slate-300 rounded-md"
        />
        <input
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          placeholder="Cód. autenticação"
          className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
        />
        <input
          type="date"
          value={validade}
          onChange={(e) => setValidade(e.target.value)}
          className="px-3 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Incluir Certidão</span>
        </button>
      </form>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        destructive
        title="Excluir Certidão"
        description={`Deseja excluir a certidão "${confirmDelete?.nome}" deste processo?`}
        confirmLabel="Excluir"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          const id = confirmDelete.id;
          setConfirmDelete(null);
          await handleDelete(id);
        }}
      />
    </div>
  );
}
