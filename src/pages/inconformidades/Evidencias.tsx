import { Check, Download, Edit, FileText, Plus, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import LocalImage from '../../components/LocalImage';
import { deviceStorage, isLocalFileUrl } from '../../services/deviceStorage';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Evidencia, NaoConformidade, TipoEvidencia } from '../../types';
import { formatDateBR } from '../../utils/engineering';

export default function EvidenciasSection({ nc }: { nc: NaoConformidade }) {
  const { addNcEvidencia, updateNcEvidencia, deleteNcEvidencia } = useFiscalStore();
  const [tipo, setTipo] = useState<TipoEvidencia>('FOTO');
  const [descricao, setDescricao] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTipo, setEditTipo] = useState<TipoEvidencia>('FOTO');
  const [editDescricao, setEditDescricao] = useState('');
  const [editData, setEditData] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Evidencia | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setSelectedFile(f);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) return;
    setSaving(true);
    try {
      let url = '#evidencia';
      if (selectedFile) {
        const stored = await deviceStorage.saveFileToDevice(selectedFile);
        url = stored.url;
      }
      await addNcEvidencia(nc.id, {
        tipo,
        descricao: descricao.trim(),
        url,
        data: new Date().toISOString().slice(0, 10),
      });
      setDescricao('');
      setSelectedFile(null);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (ev: Evidencia) => {
    setEditingId(ev.id);
    setEditTipo(ev.tipo);
    setEditDescricao(ev.descricao);
    setEditData(ev.data);
    setEditFile(null);
  };

  const handleSaveEdit = async (ev: Evidencia) => {
    if (!editDescricao.trim()) return;
    setSavingEdit(true);
    try {
      let url = ev.url;
      if (editFile) {
        const stored = await deviceStorage.saveFileToDevice(editFile);
        url = stored.url;
      }
      await updateNcEvidencia(nc.id, ev.id, {
        tipo: editTipo,
        descricao: editDescricao.trim(),
        data: editData,
        url,
      });
      setEditingId(null);
      setEditFile(null);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleAdd} className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Anexar Evidência</h3>
          <p className="text-xs text-slate-500">
            Arquivos anexados são armazenados localmente no dispositivo.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Tipo</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoEvidencia)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
            >
              {(['FOTO', 'VIDEO', 'PDF', 'ATA', 'OFICIO', 'MEMORIAL'] as const).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs text-slate-500 mb-1">Descrição</label>
            <input
              required
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Registro fotográfico pós-correção da alvenaria"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Arquivo no Celular</label>
            <input
              type="file"
              accept="image/*,video/*,.pdf"
              onChange={handleFile}
              className="w-full text-xs text-slate-600"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Adicionar Evidência'}</span>
          </button>
        </div>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {nc.evidencias.length === 0 ? (
          <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
            Nenhuma evidência anexada a esta não conformidade.
          </div>
        ) : (
          nc.evidencias.map((ev) => {
            const isEditing = editingId === ev.id;
            return (
              <div key={ev.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                {ev.tipo === 'FOTO' && ev.url && !ev.url.startsWith('#') && (
                  <LocalImage
                    src={ev.url}
                    alt={ev.descricao}
                    className="w-full h-48 object-cover"
                  />
                )}
                {isEditing ? (
                  <div className="p-4 space-y-3 bg-slate-50">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Tipo</label>
                        <select
                          value={editTipo}
                          onChange={(e) => setEditTipo(e.target.value as TipoEvidencia)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-md"
                        >
                          {(['FOTO', 'VIDEO', 'PDF', 'ATA', 'OFICIO', 'MEMORIAL'] as const).map(
                            (t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Data</label>
                        <input
                          type="date"
                          value={editData}
                          onChange={(e) => setEditData(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Descrição *</label>
                      <input
                        value={editDescricao}
                        onChange={(e) => setEditDescricao(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        Substituir arquivo (opcional)
                      </label>
                      <input
                        type="file"
                        accept="image/*,video/*,.pdf"
                        onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                        className="w-full text-xs text-slate-600"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setEditFile(null);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancelar</span>
                      </button>
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => void handleSaveEdit(ev)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-[#004A8F] rounded hover:bg-[#003970] disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{savingEdit ? 'Salvando...' : 'Salvar'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <FileText className="w-4 h-4 text-[#004A8F] mt-0.5 shrink-0" />
                      <div>
                        <div className="text-xs font-mono text-slate-500">
                          {ev.tipo} · {formatDateBR(ev.data)}
                        </div>
                        <div className="text-sm font-medium text-slate-900 mt-0.5">
                          {ev.descricao}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isLocalFileUrl(ev.url) && (
                        <button
                          type="button"
                          onClick={() =>
                            void deviceStorage.downloadStoredFile(ev.url, `evidencia_${ev.id}`)
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(ev)}
                        className="p-1.5 text-slate-500 hover:text-[#004A8F] hover:bg-slate-100 rounded"
                        title="Editar evidência"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(ev)}
                        className="p-1.5 text-slate-500 hover:text-red-700 hover:bg-red-50 rounded"
                        title="Excluir evidência"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        destructive
        title="Excluir Evidência"
        description={`Deseja remover a evidência "${confirmDelete?.descricao}"?`}
        confirmLabel="Excluir"
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          const target = confirmDelete;
          setConfirmDelete(null);
          await deleteNcEvidencia(nc.id, target.id);
        }}
      />
    </div>
  );
}
