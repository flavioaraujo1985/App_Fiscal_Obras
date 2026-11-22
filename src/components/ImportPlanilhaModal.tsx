import { AlertTriangle, Check, Download, FileSpreadsheet, Plus, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  downloadModeloPlanilhaXlsx,
  type ImportedPlanilhaItem,
  type ParsedPlanilhaResult,
  parsePlanilhaFile,
  parseXlsxFromArrayBuffer,
} from '../services/spreadsheetImporter';
import { formatCurrencyBR } from '../utils/engineering';

interface ImportPlanilhaModalProps {
  open: boolean;
  titulo?: string;
  subtitulo?: string;
  mostrarColunaExecutada?: boolean;
  onClose: () => void;
  onConfirm: (payload: {
    itens: ImportedPlanilhaItem[];
    modo: 'ACRESCENTAR' | 'SUBSTITUIR';
    atualizarValorContrato: boolean;
    arquivo?: File;
  }) => Promise<void>;
}

export default function ImportPlanilhaModal({
  open,
  titulo = 'Importar Planilha de Medição (XLSX ou PDF)',
  subtitulo = 'Carregue a planilha orçamentária ou de medição para que os cálculos de saldo e valor executado sejam feitos automaticamente.',
  mostrarColunaExecutada = true,
  onClose,
  onConfirm,
}: ImportPlanilhaModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [bufferCache, setBufferCache] = useState<ArrayBuffer | null>(null);
  const [parsed, setParsed] = useState<ParsedPlanilhaResult | null>(null);
  const [itens, setItens] = useState<ImportedPlanilhaItem[]>([]);
  const [lendo, setLendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [modo, setModo] = useState<'ACRESCENTAR' | 'SUBSTITUIR'>('ACRESCENTAR');
  const [atualizarValorContrato, setAtualizarValorContrato] = useState(false);
  const [anexarDocumento, setAnexarDocumento] = useState(true);
  const [salvando, setSalvando] = useState(false);

  if (!open) return null;

  const handleFile = async (file: File) => {
    setLendo(true);
    setErro(null);
    try {
      const buf = await file.arrayBuffer();
      const result = await parsePlanilhaFile(file);
      setArquivo(file);
      setBufferCache(buf);
      setParsed(result);
      setItens(result.items);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao ler arquivo.');
      setParsed(null);
      setItens([]);
    } finally {
      setLendo(false);
    }
  };

  const handleSwitchSheet = (sheetName: string) => {
    if (!bufferCache || !arquivo) return;
    const result = parseXlsxFromArrayBuffer(bufferCache, arquivo.name, sheetName);
    setParsed(result);
    setItens(result.items);
  };

  const updateRow = (
    id: string,
    field: keyof ImportedPlanilhaItem,
    raw: string
  ) => {
    setItens((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        if (field === 'codigo' || field === 'descricao' || field === 'unidade') {
          return { ...row, [field]: raw };
        }
        const num = Math.max(0, Number(raw.replace(',', '.')) || 0);
        const next = { ...row, [field]: num };
        next.valorTotal = Number((next.quantidadeContratada * next.precoUnitario).toFixed(2));
        return next;
      })
    );
  };

  const addEmptyRow = () => {
    setItens((prev) => [
      ...prev,
      {
        id: `imp-manual-${Date.now()}`,
        codigo: String(prev.length + 1).padStart(2, '0'),
        descricao: '',
        unidade: 'un',
        quantidadeContratada: 1,
        precoUnitario: 0,
        quantidadeMedida: 0,
        valorTotal: 0,
      },
    ]);
  };

  const removeRow = (id: string) => {
    setItens((prev) => prev.filter((r) => r.id !== id));
  };

  const totalContratado = itens.reduce(
    (acc, r) => acc + r.quantidadeContratada * r.precoUnitario,
    0
  );
  const totalMedido = itens.reduce(
    (acc, r) => acc + r.quantidadeMedida * r.precoUnitario,
    0
  );

  const handleConfirm = async () => {
    const validos = itens.filter((i) => i.descricao.trim().length > 0);
    if (validos.length === 0) {
      setErro('Informe ou importe pelo menos um item com descrição válida.');
      return;
    }
    setSalvando(true);
    try {
      await onConfirm({
        itens: validos,
        modo,
        atualizarValorContrato,
        arquivo: anexarDocumento && arquivo ? arquivo : undefined,
      });
      onClose();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-3 sm:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-5xl w-full shadow-xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-md text-[#004A8F] shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{titulo}</h3>
              <p className="text-xs text-slate-500 mt-0.5">{subtitulo}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {/* Upload + Template bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-slate-800">
                Selecione uma planilha Excel (.xlsx, .xls, .csv) ou PDF tabular (.pdf)
              </div>
              <div className="text-xs text-slate-500">
                Colunas reconhecidas: Código, Descrição, Unidade, Quantidade Contratada, Preço Unitário e Qtd Executada (opcional).
              </div>
              {arquivo && (
                <div className="text-xs font-mono text-[#004A8F] pt-1">
                  Arquivo carregado: {arquivo.name} ({(arquivo.size / 1024).toFixed(0)} KB)
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={downloadModeloPlanilhaXlsx}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Baixar Modelo (.xlsx)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv,.ods,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                disabled={lendo}
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50 whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{lendo ? 'Lendo arquivo...' : arquivo ? 'Trocar Arquivo' : 'Selecionar XLSX / PDF'}</span>
              </button>
            </div>
          </div>

          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2 text-xs text-red-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{erro}</span>
            </div>
          )}

          {parsed?.warnings.map((w, idx) => (
            <div
              key={idx}
              className="p-3 bg-amber-50 border border-amber-200 rounded-md flex items-center gap-2 text-xs text-amber-900"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{w}</span>
            </div>
          ))}

          {/* Sheet selector for multi-tab XLSX */}
          {parsed?.sheetNames && parsed.sheetNames.length > 1 && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-medium text-slate-600">Aba da planilha:</span>
              <select
                value={parsed.selectedSheet}
                onChange={(e) => handleSwitchSheet(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs font-medium"
              >
                {parsed.sheetNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Options */}
          {itens.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Modo de Importação</label>
                <select
                  value={modo}
                  onChange={(e) => setModo(e.target.value as 'ACRESCENTAR' | 'SUBSTITUIR')}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-md text-xs"
                >
                  <option value="ACRESCENTAR">Acrescentar / Atualizar itens pelo código</option>
                  <option value="SUBSTITUIR">Substituir itens atuais pela planilha</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-4">
                <input
                  type="checkbox"
                  checked={atualizarValorContrato}
                  onChange={(e) => setAtualizarValorContrato(e.target.checked)}
                  className="rounded border-slate-300 text-[#004A8F]"
                />
                <span>Atualizar valor do contrato pela soma desta planilha</span>
              </label>
              <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-4">
                <input
                  type="checkbox"
                  checked={anexarDocumento}
                  onChange={(e) => setAnexarDocumento(e.target.checked)}
                  className="rounded border-slate-300 text-[#004A8F]"
                />
                <span>Salvar arquivo original nos Documentos do Contrato</span>
              </label>
            </div>
          )}

          {/* Editable Preview Table */}
          {itens.length > 0 && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  Pré-visualização e Conferência ({itens.length} item(ns))
                </span>
                <button
                  type="button"
                  onClick={addEmptyRow}
                  className="inline-flex items-center gap-1 text-xs font-medium text-[#004A8F] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar linha</span>
                </button>
              </div>
              <div className="overflow-x-auto max-h-80">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 sticky top-0">
                    <tr>
                      <th className="px-2.5 py-2">Código</th>
                      <th className="px-2.5 py-2 min-w-[200px]">Descrição</th>
                      <th className="px-2.5 py-2 w-16">Unid</th>
                      <th className="px-2.5 py-2 text-right w-24">Qtd Contr.</th>
                      <th className="px-2.5 py-2 text-right w-28">Preço Unit.</th>
                      {mostrarColunaExecutada && (
                        <th className="px-2.5 py-2 text-right w-24">Qtd Exec.</th>
                      )}
                      <th className="px-2.5 py-2 text-right">Total Contr.</th>
                      <th className="px-2 py-2 w-9" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itens.map((row) => (
                      <tr key={row.id} className="hover:bg-slate-50/70">
                        <td className="px-2 py-1.5">
                          <input
                            value={row.codigo}
                            onChange={(e) => updateRow(row.id, 'codigo', e.target.value)}
                            className="w-24 px-2 py-1 font-mono border border-slate-200 rounded"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={row.descricao}
                            onChange={(e) => updateRow(row.id, 'descricao', e.target.value)}
                            className="w-full min-w-[180px] px-2 py-1 border border-slate-200 rounded"
                          />
                        </td>
                        <td className="px-2 py-1.5">
                          <input
                            value={row.unidade}
                            onChange={(e) => updateRow(row.id, 'unidade', e.target.value)}
                            className="w-14 px-2 py-1 font-mono border border-slate-200 rounded"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.quantidadeContratada}
                            onChange={(e) =>
                              updateRow(row.id, 'quantidadeContratada', e.target.value)
                            }
                            className="w-24 px-2 py-1 text-right font-mono tabular-nums border border-slate-200 rounded"
                          />
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={row.precoUnitario}
                            onChange={(e) => updateRow(row.id, 'precoUnitario', e.target.value)}
                            className="w-28 px-2 py-1 text-right font-mono tabular-nums border border-slate-200 rounded"
                          />
                        </td>
                        {mostrarColunaExecutada && (
                          <td className="px-2 py-1.5 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={row.quantidadeMedida}
                              onChange={(e) =>
                                updateRow(row.id, 'quantidadeMedida', e.target.value)
                              }
                              className="w-24 px-2 py-1 text-right font-mono tabular-nums border border-slate-200 rounded bg-blue-50/40"
                            />
                          </td>
                        )}
                        <td className="px-2.5 py-1.5 text-right font-mono tabular-nums font-medium text-slate-900 whitespace-nowrap">
                          {formatCurrencyBR(row.quantidadeContratada * row.precoUnitario)}
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            aria-label="Remover linha"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-end gap-6 text-xs">
                <div>
                  <span className="text-slate-500 mr-1.5">Total Planilha Contratada:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {formatCurrencyBR(totalContratado)}
                  </span>
                </div>
                {mostrarColunaExecutada && totalMedido > 0 && (
                  <div>
                    <span className="text-slate-500 mr-1.5">Valor Executado Importado:</span>
                    <span className="font-mono font-bold text-[#004A8F]">
                      {formatCurrencyBR(totalMedido)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-3 bg-slate-50 rounded-b-lg">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={salvando || itens.length === 0}
            onClick={() => void handleConfirm()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-40"
          >
            <Check className="w-4 h-4" />
            <span>{salvando ? 'Importando...' : `Confirmar Importação (${itens.length} itens)`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
