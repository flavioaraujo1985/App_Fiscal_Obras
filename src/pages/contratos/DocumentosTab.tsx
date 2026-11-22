import { Check, Download, Edit3, FileText, Plus, Trash2, Upload, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { deviceStorage, formatBytesBR, isLocalFileUrl } from '../../services/deviceStorage';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, Documento, TipoDocumento } from '../../types';
import { formatDateBR } from '../../utils/engineering';

const TIPOS_DOC: TipoDocumento[] = [
  'CONTRATO',
  'ART',
  'RRT',
  'CRONOGRAMA',
  'ORCAMENTO',
  'MEDICAO',
  'MEMORIA',
  'NOTA_FISCAL',
  'NOTIFICACAO',
  'OFICIO',
];

export default function DocumentosTab({ contrato }: { contrato: Contrato }) {
  const { db, addDocumento, updateDocumento, deleteDocumento } = useFiscalStore();
  const [tipoFilter, setTipoFilter] = useState<'ALL' | TipoDocumento>('ALL');
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<TipoDocumento>('ART');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editTipo, setEditTipo] = useState<TipoDocumento>('ART');
  const [editData, setEditData] = useState('');
  const [editFile, setEditFile] = useState<File | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [docToDelete, setDocToDelete] = useState<Documento | null>(null);

  const docs = db.documentos.filter(
    (d) => d.contratoId === contrato.id && (tipoFilter === 'ALL' || d.tipo === tipoFilter)
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    if (!nome.trim()) {
      setNome(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    setSaving(true);
    try {
      let url = `#doc-${Date.now()}`;
      let tamanho = 'Registro local';
      if (selectedFile) {
        const stored = await deviceStorage.saveFileToDevice(selectedFile);
        url = stored.url;
        tamanho = formatBytesBR(stored.size);
      }

      await addDocumento({
        contratoId: contrato.id,
        nome: nome.trim(),
        tipo,
        url,
        dataUpload: new Date().toISOString().slice(0, 10),
        tamanho,
      });
      setNome('');
      setSelectedFile(null);
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (d: Documento) => {
    setEditingId(d.id);
    setEditNome(d.nome);
    setEditTipo(d.tipo);
    setEditData(d.dataUpload);
    setEditFile(null);
  };

  const handleSaveEdit = async (d: Documento) => {
    if (!editNome.trim()) return;
    setSavingEdit(true);
    try {
      let url = d.url;
      let tamanho = d.tamanho;
      if (editFile) {
        const stored = await deviceStorage.saveFileToDevice(editFile);
        url = stored.url;
        tamanho = formatBytesBR(stored.size);
      }
      await updateDocumento(d.id, {
        nome: editNome.trim(),
        tipo: editTipo,
        dataUpload: editData || d.dataUpload,
        url,
        tamanho,
      });
      setEditingId(null);
      setEditFile(null);
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleAdd}
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Nome do Documento
            </label>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: ART Complementar de Estrutura Metálica"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Categoria</label>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoDocumento)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md"
            >
              {TIPOS_DOC.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Arquivo (Salvo no celular)
            </label>
            <label className="flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 border-dashed rounded-md cursor-pointer hover:bg-slate-100">
              <Upload className="w-3.5 h-3.5 text-slate-500" />
              <span className="truncate">{selectedFile ? selectedFile.name : 'Anexar PDF/Img'}</span>
              <input type="file" onChange={handleFileChange} className="hidden" />
            </label>
          </div>
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] whitespace-nowrap shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{saving ? 'Salvando...' : 'Salvar Documento no Dispositivo'}</span>
          </button>
        </div>
      </form>

      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setTipoFilter('ALL')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
            tipoFilter === 'ALL'
              ? 'bg-[#004A8F] text-white border-[#004A8F]'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          Todos
        </button>
        {TIPOS_DOC.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTipoFilter(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
              tipoFilter === t
                ? 'bg-[#004A8F] text-white border-[#004A8F]'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {docs.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Nenhum documento cadastrado nesta categoria.
          </div>
        ) : (
          docs.map((d) => {
            const isEditing = editingId === d.id;
            return (
              <div key={d.id} className="p-4 space-y-3">
                {isEditing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end">
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Nome do Documento
                      </label>
                      <input
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Categoria
                      </label>
                      <select
                        value={editTipo}
                        onChange={(e) => setEditTipo(e.target.value as TipoDocumento)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      >
                        {TIPOS_DOC.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Data
                      </label>
                      <input
                        type="date"
                        value={editData}
                        onChange={(e) => setEditData(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded"
                      />
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <label className="px-2 py-1.5 text-[11px] font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded cursor-pointer hover:bg-slate-100 truncate max-w-[110px]">
                        <span>{editFile ? editFile.name : 'Trocar arq.'}</span>
                        <input
                          type="file"
                          onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => void handleSaveEdit(d)}
                        className="p-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100"
                        aria-label="Salvar documento"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 text-slate-500 bg-slate-50 border border-slate-200 rounded hover:bg-slate-100"
                        aria-label="Cancelar"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-4 h-4 text-[#004A8F] shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{d.nome}</div>
                        <div className="text-xs text-slate-500">
                          {d.tipo} · {formatDateBR(d.dataUpload)}
                          {d.tamanho ? ` · ${d.tamanho}` : ''}
                          {isLocalFileUrl(d.url) ? ' · Salvo no dispositivo' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isLocalFileUrl(d.url) && (
                        <button
                          type="button"
                          onClick={() => void deviceStorage.downloadStoredFile(d.url, d.nome)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => startEdit(d)}
                        className="p-1.5 text-slate-400 hover:text-[#004A8F] rounded"
                        aria-label="Editar documento"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDocToDelete(d)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded"
                        aria-label="Excluir documento"
                      >
                        <Trash2 className="w-4 h-4" />
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
        open={Boolean(docToDelete)}
        destructive
        title="Excluir Documento"
        description={
          docToDelete
            ? `Tem certeza que deseja excluir o documento "${docToDelete.nome}"? Se houver arquivo salvo no dispositivo, ele também será removido.`
            : ''
        }
        confirmLabel="Excluir Documento"
        onCancel={() => setDocToDelete(null)}
        onConfirm={async () => {
          if (docToDelete) {
            await deleteDocumento(docToDelete.id);
          }
          setDocToDelete(null);
        }}
      />
    </div>
  );
}
