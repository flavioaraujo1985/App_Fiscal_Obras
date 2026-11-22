import { FileSpreadsheet, Upload, X } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  type ImportedPlanilhaItem,
  parsePlanilhaFile,
} from '../../services/spreadsheetImporter';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { ContratoStatus } from '../../types';
import { formatCurrencyBR } from '../../utils/engineering';

interface ContratoFormProps {
  open: boolean;
  onClose: () => void;
}

export default function ContratoForm({ open, onClose }: ContratoFormProps) {
  const { addContrato, importPlanilhaContrato, pushToast, db } = useFiscalStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [numero, setNumero] = useState('');
  const [processo, setProcesso] = useState('');
  const [objeto, setObjeto] = useState('');
  const [contratada, setContratada] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [gestor, setGestor] = useState(db.configuracoes.gestorPadrao);
  const [fiscal, setFiscal] = useState(db.configuracoes.fiscalPadrao);
  const [valorInicial, setValorInicial] = useState('1500000');
  const [dataInicio, setDataInicio] = useState('2026-11-21');
  const [dataFim, setDataFim] = useState('2027-08-21');
  const [municipio, setMunicipio] = useState(db.configuracoes.cidadeUf);
  const [status, setStatus] = useState<ContratoStatus>('ATIVO');
  const [submitting, setSubmitting] = useState(false);
  const [planilhaFile, setPlanilhaFile] = useState<File | null>(null);
  const [planilhaItens, setPlanilhaItens] = useState<ImportedPlanilhaItem[]>([]);
  const [lendoPlanilha, setLendoPlanilha] = useState(false);

  if (!open) return null;

  const handleUploadPlanilha = async (file: File) => {
    setLendoPlanilha(true);
    try {
      const res = await parsePlanilhaFile(file);
      if (res.items.length === 0) {
        pushToast('error', res.warnings[0] ?? 'Nenhum item identificado na planilha.');
        return;
      }
      setPlanilhaFile(file);
      setPlanilhaItens(res.items);
      const total = res.items.reduce(
        (acc, i) => acc + i.quantidadeContratada * i.precoUnitario,
        0
      );
      if (total > 0) {
        setValorInicial(total.toFixed(2));
      }
      pushToast(
        'success',
        `${res.items.length} item(ns) lidos da planilha "${file.name}" (${formatCurrencyBR(total)}).`
      );
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Erro ao ler planilha.');
    } finally {
      setLendoPlanilha(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!numero.trim() || !contratada.trim() || !objeto.trim()) return;
    setSubmitting(true);
    try {
      const created = await addContrato({
        numero: numero.trim(),
        processo: processo.trim() || 'PROC-2026/0001',
        objeto: objeto.trim(),
        contratada: contratada.trim(),
        cnpj: cnpj.trim() || '00.000.000/0001-00',
        gestor: gestor.trim(),
        fiscal: fiscal.trim(),
        valorInicial: Number(valorInicial) || 0,
        dataInicio,
        dataFim,
        status,
        municipio: municipio.trim(),
        latitude: -7.2306,
        longitude: -35.8811,
        checklist: {
          contratoAssinado: true,
          artRrt: false,
          cronograma: false,
          garantia: false,
          fiscalDesignado: Boolean(fiscal.trim()),
          gestorDesignado: Boolean(gestor.trim()),
        },
      });
      if (planilhaItens.length > 0) {
        await importPlanilhaContrato({
          contratoId: created.id,
          itens: planilhaItens,
          modo: 'SUBSTITUIR',
          atualizarValorContrato: false,
          arquivo: planilhaFile ?? undefined,
          fonteNome: planilhaFile?.name,
        });
      }
      setNumero('');
      setProcesso('');
      setObjeto('');
      setContratada('');
      setCnpj('');
      setPlanilhaFile(null);
      setPlanilhaItens([]);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white border border-slate-200 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-lg">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Cadastrar Novo Contrato</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Número *</label>
            <input
              required
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ex: 2026.012"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Processo</label>
            <input
              value={processo}
              onChange={(e) => setProcesso(e.target.value)}
              placeholder="Ex: PROC-2026/01982"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Objeto *</label>
            <textarea
              required
              rows={2}
              value={objeto}
              onChange={(e) => setObjeto(e.target.value)}
              placeholder="Descrição completa do objeto contratado..."
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Contratada *</label>
            <input
              required
              value={contratada}
              onChange={(e) => setContratada(e.target.value)}
              placeholder="Razão social da empresa"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">CNPJ</label>
            <input
              value={cnpj}
              onChange={(e) => setCnpj(e.target.value)}
              placeholder="00.000.000/0001-00"
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Gestor</label>
            <input
              value={gestor}
              onChange={(e) => setGestor(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fiscal</label>
            <input
              value={fiscal}
              onChange={(e) => setFiscal(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Valor Inicial (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={valorInicial}
              onChange={(e) => setValorInicial(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ContratoStatus)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            >
              <option value="ATIVO">Ativo</option>
              <option value="SUSPENSO">Suspenso</option>
              <option value="ENCERRADO">Encerrado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data Início</label>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Data Fim</label>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Município / Local</label>
            <input
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
            />
          </div>

          <div className="sm:col-span-2 p-3.5 bg-slate-50 border border-dashed border-slate-300 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <FileSpreadsheet className="w-4 h-4 text-[#00897B] mt-0.5 shrink-0" />
              <div className="text-xs">
                <div className="font-semibold text-slate-800">
                  Planilha Base do Contrato (XLSX ou PDF) — Opcional
                </div>
                <div className="text-slate-500">
                  {planilhaItens.length > 0 && planilhaFile
                    ? `${planilhaFile.name} · ${planilhaItens.length} itens carregados como banco de dados`
                    : 'Ao anexar a planilha, ela vira o banco de dados do contrato e preenche o valor inicial.'}
                </div>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,.ods,.pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void handleUploadPlanilha(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={lendoPlanilha}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#00897B] rounded-md hover:bg-[#007367] disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>
                {lendoPlanilha
                  ? 'Lendo...'
                  : planilhaItens.length > 0
                  ? 'Trocar Planilha'
                  : 'Carregar XLSX / PDF'}
              </span>
            </button>
          </div>

          <div className="sm:col-span-2 pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50"
            >
              {submitting ? 'Salvando...' : 'Salvar Contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
