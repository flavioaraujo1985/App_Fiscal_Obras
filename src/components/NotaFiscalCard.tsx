import { CheckCircle2, Download, FileText, Receipt, Save, Trash2, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { deviceStorage, isLocalFileUrl } from '../services/deviceStorage';
import type { NotaFiscalInfo } from '../types';
import { formatCurrencyBR, formatDateBR } from '../utils/engineering';

interface NotaFiscalCardProps {
  notaFiscal?: NotaFiscalInfo;
  valorSugerido: number;
  contratada: string;
  onSave: (nf: NotaFiscalInfo) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export default function NotaFiscalCard({
  notaFiscal,
  valorSugerido,
  contratada,
  onSave,
  onDelete,
}: NotaFiscalCardProps) {
  const [numero, setNumero] = useState(notaFiscal?.numero ?? '');
  const [serie, setSerie] = useState(notaFiscal?.serie ?? '001');
  const [dataEmissao, setDataEmissao] = useState(
    notaFiscal?.dataEmissao ?? new Date().toISOString().slice(0, 10)
  );
  const [valor, setValor] = useState(
    String(notaFiscal?.valor ?? (valorSugerido > 0 ? valorSugerido : 0))
  );
  const [chaveAcesso, setChaveAcesso] = useState(notaFiscal?.chaveAcesso ?? '');
  const [arquivoUrl, setArquivoUrl] = useState(notaFiscal?.arquivoUrl);
  const [arquivoNome, setArquivoNome] = useState(notaFiscal?.arquivoNome);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    setNumero(notaFiscal?.numero ?? '');
    setSerie(notaFiscal?.serie ?? '001');
    setDataEmissao(notaFiscal?.dataEmissao ?? new Date().toISOString().slice(0, 10));
    setValor(String(notaFiscal?.valor ?? (valorSugerido > 0 ? valorSugerido : 0)));
    setChaveAcesso(notaFiscal?.chaveAcesso ?? '');
    setArquivoUrl(notaFiscal?.arquivoUrl);
    setArquivoNome(notaFiscal?.arquivoNome);
    setPendingFile(null);
  }, [notaFiscal, valorSugerido]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setArquivoNome(file.name);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim()) return;
    setSaving(true);
    try {
      let nextUrl = arquivoUrl;
      let nextNome = arquivoNome;
      if (pendingFile) {
        const stored = await deviceStorage.saveFileToDevice(pendingFile);
        nextUrl = stored.url;
        nextNome = pendingFile.name;
      }

      const numericVal = Number(valor.replace(',', '.')) || 0;
      await onSave({
        numero: numero.trim(),
        serie: serie.trim() || undefined,
        dataEmissao,
        valor: Number(numericVal.toFixed(2)),
        chaveAcesso: chaveAcesso.trim() || undefined,
        arquivoUrl: nextUrl,
        arquivoNome: nextNome,
      });
      setArquivoUrl(nextUrl);
      setArquivoNome(nextNome);
      setPendingFile(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 no-print"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <Receipt className="w-4 h-4 text-[#004A8F]" />
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Nota Fiscal da Contratada
            </h3>
            <p className="text-xs text-slate-500">
              Emitente: {contratada} · Anexo salvo no dispositivo
            </p>
          </div>
        </div>

        {notaFiscal?.numero && (
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="w-4 h-4" />
            <span>
              {notaFiscal.numero} · {formatCurrencyBR(notaFiscal.valor)} (
              {formatDateBR(notaFiscal.dataEmissao)})
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Nº da Nota Fiscal *
          </label>
          <input
            required
            value={numero}
            onChange={(e) => setNumero(e.target.value)}
            placeholder="NF-e 000.419.105"
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Série</label>
          <input
            value={serie}
            onChange={(e) => setSerie(e.target.value)}
            placeholder="001"
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Data de Emissão *
          </label>
          <input
            required
            type="date"
            value={dataEmissao}
            onChange={(e) => setDataEmissao(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Valor da NF (R$) *</label>
          <input
            required
            type="number"
            step="0.01"
            min="0"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Arquivo NF (PDF / Foto)
          </label>
          <label className="flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 border-dashed rounded-md cursor-pointer hover:bg-slate-100">
            <Upload className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="truncate">
              {pendingFile
                ? pendingFile.name
                : arquivoNome || 'Anexar NF-e'}
            </span>
            <input
              type="file"
              accept=".pdf,image/*,.xml"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Chave de Acesso NF-e / Código de Autenticidade NFS-e
          </label>
          <input
            value={chaveAcesso}
            onChange={(e) => setChaveAcesso(e.target.value)}
            placeholder="Ex: 2526 1108 4219 0000 0144 5500 1000 4191 0512 3456 7890"
            className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-md"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {onDelete && notaFiscal?.numero && (
            <button
              type="button"
              onClick={() => setConfirmDeleteOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 whitespace-nowrap shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Excluir NF</span>
            </button>
          )}
          {arquivoUrl && isLocalFileUrl(arquivoUrl) && (
            <button
              type="button"
              onClick={() =>
                void deviceStorage.downloadStoredFile(
                  arquivoUrl,
                  arquivoNome || `nota-fiscal-${numero || 'anexo'}`
                )
              }
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar NF</span>
            </button>
          )}
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            {saving ? (
              <FileText className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span>{saving ? 'Salvando...' : 'Salvar Nota Fiscal'}</span>
          </button>
        </div>
      </div>

      {onDelete && (
        <ConfirmDialog
          open={confirmDeleteOpen}
          destructive
          title="Excluir Nota Fiscal"
          description={`Deseja remover os dados e o anexo da Nota Fiscal "${notaFiscal?.numero}"?`}
          confirmLabel="Excluir Nota Fiscal"
          onCancel={() => setConfirmDeleteOpen(false)}
          onConfirm={async () => {
            setConfirmDeleteOpen(false);
            await onDelete();
          }}
        />
      )}
    </form>
  );
}
