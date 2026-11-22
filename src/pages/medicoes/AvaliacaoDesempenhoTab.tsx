import { AlertTriangle, Check, ClipboardCheck, FileDown, RotateCcw, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import { gerarPdfAvaliacaoDesempenho } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type {
  AvaliacaoDesempenho,
  AvaliacaoDesempenhoItem,
  AvaliadorDesempenho,
  ConceitoAvaliacao,
  Contrato,
  Medicao,
} from '../../types';
import {
  calcularAvaliacaoDesempenho,
  criarItensAvaliacaoPadrao,
  formatCurrencyBR,
  formatDateBR,
  formatNumberBR,
  toRomanNumeral,
} from '../../utils/engineering';

interface Props {
  medicao: Medicao;
  contrato: Contrato;
}

function buildDefaultAvaliadores(
  contrato: Contrato,
  creaFiscal: string,
  prev?: AvaliadorDesempenho[]
): AvaliadorDesempenho[] {
  if (prev && prev.length === 3) {
    return prev.map((a) => ({ ...a }));
  }
  return [
    {
      papel: 'Fiscal avaliador 01',
      nome: contrato.fiscal,
      cargoRegistro: creaFiscal || 'Fiscal do Contrato',
      matricula: '',
      portaria: '',
    },
    {
      papel: 'Fiscal avaliador 02',
      nome: '',
      cargoRegistro: '',
      matricula: '',
      portaria: '',
    },
    {
      papel: 'Gestor avaliador 03',
      nome: contrato.gestor,
      cargoRegistro: 'Gestor do Contrato',
      matricula: '',
      portaria: '',
    },
  ];
}

export default function AvaliacaoDesempenhoTab({ medicao, contrato }: Props) {
  const { db, saveAvaliacaoDesempenho, deleteAvaliacaoDesempenho, pushToast } = useFiscalStore();

  const aditivosContrato = useMemo(
    () =>
      db.aditivos
        .filter((a) => a.contratoId === contrato.id)
        .sort((a, b) => a.numero - b.numero),
    [db.aditivos, contrato.id]
  );

  const ultimoAditivo = aditivosContrato[aditivosContrato.length - 1];
  const numeroAditivoStr = ultimoAditivo
    ? `${toRomanNumeral(ultimoAditivo.numero)} TERMO ADITIVO`
    : '—';
  const valorAditivos = useMemo(
    () =>
      aditivosContrato
        .filter((a) => a.tipo === 'VALOR')
        .reduce((acc, a) => acc + a.valor, 0),
    [aditivosContrato]
  );

  const ncsAbertasContrato = useMemo(
    () =>
      db.naoConformidades.filter(
        (nc) => nc.contratoId === contrato.id && nc.status !== 'ENCERRADA'
      ),
    [db.naoConformidades, contrato.id]
  );

  // Locate most recent prior measurement with an evaluation on this contract
  const avaliacaoAnteriorMedicao = useMemo(() => {
    const anteriores = db.medicoes
      .filter(
        (m) =>
          m.contratoId === contrato.id &&
          m.numero < medicao.numero &&
          Boolean(m.avaliacaoDesempenho)
      )
      .sort((a, b) => b.numero - a.numero);
    return anteriores[0];
  }, [db.medicoes, contrato.id, medicao.numero]);

  const [diretoria, setDiretoria] = useState('');
  const [regional, setRegional] = useState('');
  const [gerencia, setGerencia] = useState('');
  const [unidade, setUnidade] = useState('');
  const [endereco, setEndereco] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState(contrato.municipio);
  const [cep, setCep] = useState('');
  const [telefone, setTelefone] = useState('');
  const [itens, setItens] = useState<AvaliacaoDesempenhoItem[]>(() =>
    criarItensAvaliacaoPadrao()
  );
  const [mediaAnteriorInput, setMediaAnteriorInput] = useState<string>('');
  const [descumpriuClausula, setDescumpriuClausula] = useState<boolean>(false);
  const [observacoes, setObservacoes] = useState<string>('');
  const [avaliadores, setAvaliadores] = useState<AvaliadorDesempenho[]>(() =>
    buildDefaultAvaliadores(contrato, db.configuracoes.creaFiscal)
  );
  const [salvando, setSalvando] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [confirmExcluirOpen, setConfirmExcluirOpen] = useState(false);
  const [maEmAndamento, setMaEmAndamento] = useState(false);
  const mediaAnteriorInputRef = useRef<HTMLInputElement>(null);
  const lastHydratedKeyRef = useRef<string>('');

  // Hydrate form when measurement changes or a new saved evaluation is persisted
  useEffect(() => {
    const hydrationKey = `${medicao.id}:${medicao.avaliacaoDesempenho?.atualizadoEm ?? 'unsaved'}:${avaliacaoAnteriorMedicao?.id ?? 'no-prev'}`;
    if (lastHydratedKeyRef.current === hydrationKey) return;
    lastHydratedKeyRef.current = hydrationKey;

    const saved = medicao.avaliacaoDesempenho;
    const prev = avaliacaoAnteriorMedicao?.avaliacaoDesempenho;
    const baseMeta = saved ?? prev;

    setDiretoria(baseMeta?.diretoria ?? '');
    setRegional(baseMeta?.regional ?? '');
    setGerencia(baseMeta?.gerencia ?? '');
    setUnidade(baseMeta?.unidade ?? db.configuracoes.secretaria ?? '');
    setEndereco(baseMeta?.endereco ?? '');
    setBairro(baseMeta?.bairro ?? '');
    setCidade(baseMeta?.cidade ?? contrato.municipio ?? '');
    setCep(baseMeta?.cep ?? '');
    setTelefone(baseMeta?.telefone ?? '');

    if (saved) {
      setItens(saved.itens.map((i) => ({ ...i })));
      const hasSavedMa =
        saved.mediaAnterior !== null && Number.isFinite(saved.mediaAnterior);
      setMediaAnteriorInput(
        hasSavedMa ? formatNumberBR(saved.mediaAnterior as number) : ''
      );
      setMaEmAndamento(hasSavedMa);
      setDescumpriuClausula(saved.descumpriuClausula);
      setObservacoes(saved.observacoes);
      setAvaliadores(
        buildDefaultAvaliadores(contrato, db.configuracoes.creaFiscal, saved.avaliadores)
      );
    } else {
      setItens(criarItensAvaliacaoPadrao());
      if (prev && Number.isFinite(prev.maa)) {
        setMediaAnteriorInput(formatNumberBR(prev.maa));
        setMaEmAndamento(true);
      } else {
        setMediaAnteriorInput('');
        setMaEmAndamento(false);
      }
      setDescumpriuClausula(false);
      setObservacoes('');
      setAvaliadores(
        buildDefaultAvaliadores(contrato, db.configuracoes.creaFiscal, prev?.avaliadores)
      );
    }
  }, [medicao.id, medicao.avaliacaoDesempenho, avaliacaoAnteriorMedicao, contrato, db.configuracoes.creaFiscal, db.configuracoes.secretaria]);

  const mediaAnteriorParsed = useMemo<number | null>(() => {
    const cleaned = mediaAnteriorInput.trim().replace(/\s+/g, '');
    if (cleaned === '') return null;
    const normalized = cleaned.includes(',')
      ? cleaned.replace(/\./g, '').replace(',', '.')
      : cleaned;
    const num = Number(normalized);
    if (!Number.isFinite(num) || num < 0) return null;
    return Number(num.toFixed(2));
  }, [mediaAnteriorInput]);

  const calc = useMemo(
    () => calcularAvaliacaoDesempenho(itens, mediaAnteriorParsed),
    [itens, mediaAnteriorParsed]
  );

  const handleSelectConceito = (itemId: string, conceito: ConceitoAvaliacao) => {
    setItens((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        if (conceito === 'BOM') {
          return { ...it, bom: 75, regular: 0, ruim: 0, conceitoSelecionado: 'BOM' };
        }
        if (conceito === 'REGULAR') {
          return { ...it, bom: 0, regular: 50, ruim: 0, conceitoSelecionado: 'REGULAR' };
        }
        return { ...it, bom: 0, regular: 0, ruim: 0, conceitoSelecionado: 'RUIM' };
      })
    );
  };

  const handleInputNota = (
    itemId: string,
    campo: 'bom' | 'regular' | 'ruim',
    rawValue: string
  ) => {
    const num = rawValue.trim() === '' ? 0 : Math.max(0, Number(rawValue));
    setItens((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const updated = {
          ...it,
          [campo]: Number.isFinite(num) ? num : 0,
        };
        if (updated.bom > 0 && updated.regular === 0 && updated.ruim === 0) {
          updated.conceitoSelecionado = 'BOM';
        } else if (updated.regular > 0 && updated.bom === 0 && updated.ruim === 0) {
          updated.conceitoSelecionado = 'REGULAR';
        } else if (updated.bom === 0 && updated.regular === 0 && updated.ruim === 0) {
          updated.conceitoSelecionado = it.conceitoSelecionado === 'RUIM' ? 'RUIM' : null;
        } else {
          updated.conceitoSelecionado = null;
        }
        return updated;
      })
    );
  };

  const handleMarcarTodos = (conceito: ConceitoAvaliacao) => {
    setItens((prev) =>
      prev.map((it) => {
        if (conceito === 'BOM') {
          return { ...it, bom: 75, regular: 0, ruim: 0, conceitoSelecionado: 'BOM' };
        }
        if (conceito === 'REGULAR') {
          return { ...it, bom: 0, regular: 50, ruim: 0, conceitoSelecionado: 'REGULAR' };
        }
        return { ...it, bom: 0, regular: 0, ruim: 0, conceitoSelecionado: 'RUIM' };
      })
    );
  };

  const updateAvaliador = (
    idx: number,
    field: keyof AvaliadorDesempenho,
    value: string
  ) => {
    setAvaliadores((prev) =>
      prev.map((av, i) => (i === idx ? { ...av, [field]: value } : av))
    );
  };

  const buildPayload = (): AvaliacaoDesempenho => ({
    medicaoId: medicao.id,
    diretoria: diretoria.trim(),
    regional: regional.trim(),
    gerencia: gerencia.trim(),
    unidade: unidade.trim(),
    endereco: endereco.trim(),
    bairro: bairro.trim(),
    cidade: cidade.trim(),
    cep: cep.trim(),
    telefone: telefone.trim(),
    itens,
    mediaAnterior: mediaAnteriorParsed,
    nma: calc.nma,
    maa: calc.maa,
    descumpriuClausula,
    observacoes: observacoes.trim(),
    avaliadores,
    atualizadoEm: new Date().toISOString(),
  });

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await saveAvaliacaoDesempenho(medicao.id, buildPayload());
    } finally {
      setSalvando(false);
    }
  };

  const handleGerarPdf = async () => {
    setGerandoPdf(true);
    try {
      const payload = buildPayload();
      await saveAvaliacaoDesempenho(medicao.id, payload);
      await gerarPdfAvaliacaoDesempenho({
        avaliacao: payload,
        medicao,
        contrato,
        aditivos: db.aditivos,
        config: db.configuracoes,
      });
      pushToast('success', 'PDF da Avaliação de Desempenho gerado e salvo no dispositivo.');
    } finally {
      setGerandoPdf(false);
    }
  };

  const handlePreencherNCs = () => {
    if (ncsAbertasContrato.length === 0) return;
    const resumoNCs = ncsAbertasContrato
      .map((nc) => `${nc.codigo} (${nc.gravidade}): ${nc.titulo}`)
      .join('; ');
    setDescumpriuClausula(true);
    setObservacoes((prev) =>
      prev.trim()
        ? `${prev.trim()}\nNão conformidades pendentes: ${resumoNCs}`
        : `Não conformidades registradas no período: ${resumoNCs}`
    );
  };

  return (
    <div className="space-y-5">
      {/* Top Action & Synced Identity Header */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="bg-[#1B365D] text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/10 rounded-md shrink-0 mt-0.5">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                AVALIAÇÃO DE DESEMPENHO DE PRESTADORES DE SERVIÇOS
              </h2>
              <p className="text-xs text-slate-200 mt-0.5">
                Vinculada ao Boletim de Medição nº{' '}
                <strong className="font-mono text-white">
                  {medicao.numero.toString().padStart(2, '0')}
                </strong>{' '}
                · Data:{' '}
                <strong className="font-mono text-white">
                  {formatDateBR(medicao.dataFim)}
                </strong>{' '}
                · Valor dos serviços executados:{' '}
                <strong className="font-mono text-emerald-300">
                  {formatCurrencyBR(medicao.valor)}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
            {medicao.avaliacaoDesempenho && (
              <button
                type="button"
                onClick={() => setConfirmExcluirOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Avaliação</span>
              </button>
            )}
            <button
              type="button"
              disabled={salvando}
              onClick={() => void handleSalvar()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{salvando ? 'Salvando...' : 'Salvar Avaliação'}</span>
            </button>
            <button
              type="button"
              disabled={gerandoPdf}
              onClick={() => void handleGerarPdf()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#1B365D] bg-white rounded-md hover:bg-slate-100 disabled:opacity-50"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>{gerandoPdf ? 'Gerando PDF...' : 'Baixar Avaliação (PDF)'}</span>
            </button>
          </div>
        </div>

        {/* Read-only synced Boletim & Contrato metadata + editable org/address fields */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Diretoria
              </label>
              <input
                value={diretoria}
                onChange={(e) => setDiretoria(e.target.value)}
                placeholder="Ex.: DO"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Regional
              </label>
              <input
                value={regional}
                onChange={(e) => setRegional(e.target.value)}
                placeholder="Ex.: RSE"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Gerência
              </label>
              <input
                value={gerencia}
                onChange={(e) => setGerencia(e.target.value)}
                placeholder="Ex.: RSE"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Unid.
              </label>
              <input
                value={unidade}
                onChange={(e) => setUnidade(e.target.value)}
                placeholder="Ex.: UNES"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 border border-slate-200 rounded-md p-3">
            <div className="md:col-span-2">
              <div className="text-[11px] font-semibold uppercase text-slate-500">
                Razão Social
              </div>
              <div className="text-xs font-bold text-slate-900 mt-0.5">
                {contrato.contratada}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase text-slate-500">CNPJ</div>
              <div className="text-xs font-mono font-bold text-slate-900 mt-0.5">
                {contrato.cnpj}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Endereço
              </label>
              <input
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                placeholder="Logradouro e número da contratada"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Bairro
              </label>
              <input
                value={bairro}
                onChange={(e) => setBairro(e.target.value)}
                placeholder="Bairro"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Cidade
              </label>
              <input
                value={cidade}
                onChange={(e) => setCidade(e.target.value)}
                placeholder="Município/UF"
                className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded-md"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                CEP
              </label>
              <input
                value={cep}
                onChange={(e) => setCep(e.target.value)}
                placeholder="00000-000"
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold uppercase text-slate-500 mb-1">
                Telefone
              </label>
              <input
                value={telefone}
                onChange={(e) => setTelefone(e.target.value)}
                placeholder="(00) 0000-0000"
                className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-300 rounded-md"
              />
            </div>
          </div>

          {/* Synced Contrato / Aditivo / Boletim de Medição summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#DCE6F1]/40 border border-slate-200 rounded-md p-3 text-xs">
            <div>
              <div className="text-[11px] font-semibold text-slate-500">
                Nº Contrato ou AES
              </div>
              <div className="font-bold text-slate-900 font-mono">{contrato.numero}</div>
              <div className="text-[11px] text-slate-600 font-mono">
                Valor: {formatCurrencyBR(contrato.valorInicial)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">Nº Aditivo</div>
              <div className="font-bold text-slate-900">{numeroAditivoStr}</div>
              <div className="text-[11px] text-slate-600 font-mono">
                Valor: {formatCurrencyBR(valorAditivos)}
              </div>
            </div>
            <div>
              <div className="text-[11px] font-semibold text-slate-500">
                Vigência da Obra
              </div>
              <div className="font-mono font-semibold text-slate-900">
                Início: {formatDateBR(contrato.dataInicio)}
              </div>
              <div className="font-mono font-semibold text-slate-900">
                Término: {formatDateBR(contrato.dataFim)}
              </div>
            </div>
            <div className="bg-white border border-[#1B365D]/25 rounded p-2">
              <div className="text-[11px] font-bold text-[#1B365D]">
                Nº Boletim Medição: {medicao.numero.toString().padStart(2, '0')}
              </div>
              <div className="text-[11px] text-slate-500">
                Data: <span className="font-mono">{formatDateBR(medicao.dataFim)}</span>
              </div>
              <div className="text-xs font-bold text-emerald-700 font-mono mt-0.5">
                {formatCurrencyBR(medicao.valor)}
              </div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
            <div className="text-[11px] font-semibold uppercase text-slate-500">
              Objeto do Contrato ou AES
            </div>
            <p className="text-xs text-slate-800 mt-1 leading-relaxed">{contrato.objeto}</p>
          </div>
        </div>
      </div>

      {/* Scoring Table Matching PDF Template */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Critérios de Avaliação (Tópicos / Obra)
            </h3>
            <p className="text-[11px] text-slate-500">
              Nota do item = (Bom + Regular + Ruim) × Peso · NMA = (Soma das notas finais) / 100 ·
              MAA = Média aritmética (MA e NMA)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 no-print">
            <span className="text-[11px] text-slate-500 mr-1">Marcar todos:</span>
            <button
              type="button"
              onClick={() => handleMarcarTodos('BOM')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              BOM (75)
            </button>
            <button
              type="button"
              onClick={() => handleMarcarTodos('REGULAR')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            >
              REGULAR (50)
            </button>
            <button
              type="button"
              onClick={() => handleMarcarTodos('RUIM')}
              className="px-2.5 py-1 text-[11px] font-semibold rounded bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
            >
              RUIM (0)
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-[#1B365D] text-white">
                <th rowSpan={2} className="text-left px-3 py-2 border border-slate-700 min-w-[230px]">
                  TÓPICOS / OBRA
                </th>
                <th className="text-center px-3 py-1.5 border border-slate-700 w-20">Peso</th>
                <th className="text-center px-3 py-1.5 border border-slate-700 w-36">BOM</th>
                <th className="text-center px-3 py-1.5 border border-slate-700 w-36">REGULAR</th>
                <th className="text-center px-3 py-1.5 border border-slate-700 w-36">RUIM</th>
                <th className="text-right px-3 py-1.5 border border-slate-700 w-32">Nota Final</th>
              </tr>
              <tr className="bg-[#244675] text-slate-100 text-[11px]">
                <th className="text-center px-3 py-1 border border-slate-700 font-mono">
                  {calc.somaPesos}
                </th>
                <th className="text-center px-3 py-1 border border-slate-700 font-mono">75</th>
                <th className="text-center px-3 py-1 border border-slate-700 font-mono">50</th>
                <th className="text-center px-3 py-1 border border-slate-700 font-mono">0</th>
                <th className="text-right px-3 py-1 border border-slate-700 font-normal">
                  (B+R+Ru) × Peso
                </th>
              </tr>
            </thead>
            <tbody>
              {calc.itensCalculados.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/70">
                  <td className="px-3 py-2.5 border border-slate-200 font-semibold text-slate-900">
                    {item.titulo}
                  </td>
                  <td className="px-3 py-2.5 border border-slate-200 text-center font-mono font-bold text-slate-800 bg-slate-50">
                    {item.peso}
                  </td>

                  {/* BOM (75) */}
                  <td className="px-2 py-2 border border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectConceito(item.id, 'BOM')}
                        title="Atribuir BOM (75)"
                        className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors shrink-0 ${
                          item.conceitoSelecionado === 'BOM'
                            ? 'bg-emerald-600 text-white border-emerald-700'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-emerald-50'
                        }`}
                      >
                        75
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={item.bom === 0 && item.conceitoSelecionado !== 'BOM' ? '' : item.bom}
                        placeholder="0"
                        onChange={(e) => handleInputNota(item.id, 'bom', e.target.value)}
                        aria-label={`${item.titulo} - BOM`}
                        className="w-full px-2 py-1 text-right font-mono text-xs border border-slate-300 rounded focus:border-[#004A8F] focus:outline-none"
                      />
                    </div>
                  </td>

                  {/* REGULAR (50) */}
                  <td className="px-2 py-2 border border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectConceito(item.id, 'REGULAR')}
                        title="Atribuir REGULAR (50)"
                        className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors shrink-0 ${
                          item.conceitoSelecionado === 'REGULAR'
                            ? 'bg-amber-500 text-white border-amber-600'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-amber-50'
                        }`}
                      >
                        50
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={
                          item.regular === 0 && item.conceitoSelecionado !== 'REGULAR'
                            ? ''
                            : item.regular
                        }
                        placeholder="0"
                        onChange={(e) => handleInputNota(item.id, 'regular', e.target.value)}
                        aria-label={`${item.titulo} - REGULAR`}
                        className="w-full px-2 py-1 text-right font-mono text-xs border border-slate-300 rounded focus:border-[#004A8F] focus:outline-none"
                      />
                    </div>
                  </td>

                  {/* RUIM (0) */}
                  <td className="px-2 py-2 border border-slate-200">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleSelectConceito(item.id, 'RUIM')}
                        title="Atribuir RUIM (0)"
                        className={`px-2 py-1 rounded text-[11px] font-semibold border transition-colors shrink-0 ${
                          item.conceitoSelecionado === 'RUIM'
                            ? 'bg-rose-600 text-white border-rose-700'
                            : 'bg-white text-slate-600 border-slate-300 hover:bg-rose-50'
                        }`}
                      >
                        0
                      </button>
                      <input
                        type="number"
                        step="0.01"
                        min={0}
                        value={
                          item.ruim === 0 && item.conceitoSelecionado !== 'RUIM' ? '' : item.ruim
                        }
                        placeholder="0"
                        onChange={(e) => handleInputNota(item.id, 'ruim', e.target.value)}
                        aria-label={`${item.titulo} - RUIM`}
                        className="w-full px-2 py-1 text-right font-mono text-xs border border-slate-300 rounded focus:border-[#004A8F] focus:outline-none"
                      />
                    </div>
                  </td>

                  {/* Nota calculada */}
                  <td className="px-3 py-2.5 border border-slate-200 text-right font-mono tabular-nums bg-slate-50">
                    <div className="font-bold text-slate-900">
                      {formatNumberBR(item.notaFinal)}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      ({formatNumberBR(item.somaNotas, item.somaNotas % 1 === 0 ? 0 : 2)} ×{' '}
                      {item.peso})
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-semibold text-slate-800">
                <td colSpan={5} className="px-3 py-2 border border-slate-200 text-right">
                  Soma das notas finais dos itens avaliados:
                </td>
                <td className="px-3 py-2 border border-slate-200 text-right font-mono tabular-nums font-bold text-slate-900">
                  {formatNumberBR(calc.somaNotasFinais)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Summary Metrics Row: MA | NMA | MAA */}
        <div className="grid grid-cols-1 md:grid-cols-3 border-t border-slate-200 divide-y md:divide-y-0 md:divide-x divide-slate-200">
          <div className="p-4 bg-[#DCE6F1]/35 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="avaliacao-media-anterior"
                className="text-xs font-bold text-[#1B365D]"
              >
                Média Anterior (MA)
              </label>
              {avaliacaoAnteriorMedicao?.avaliacaoDesempenho && (
                <button
                  type="button"
                  onClick={() => {
                    setMaEmAndamento(true);
                    setMediaAnteriorInput(
                      formatNumberBR(avaliacaoAnteriorMedicao.avaliacaoDesempenho!.maa)
                    );
                  }}
                  className="inline-flex items-center gap-1 text-[11px] text-[#004A8F] hover:underline no-print"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Usar MAA da Med. {avaliacaoAnteriorMedicao.numero}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-1.5 no-print">
              <button
                type="button"
                onClick={() => {
                  setMaEmAndamento(false);
                  setMediaAnteriorInput('');
                }}
                className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors ${
                  !maEmAndamento && mediaAnteriorParsed === null
                    ? 'bg-[#1B365D] text-white border-[#1B365D]'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                1ª Avaliação (sem MA)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMaEmAndamento(true);
                  setTimeout(() => mediaAnteriorInputRef.current?.focus(), 0);
                }}
                className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors ${
                  maEmAndamento || mediaAnteriorParsed !== null
                    ? 'bg-[#004A8F] text-white border-[#004A8F]'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Contrato em andamento
              </button>
            </div>

            <input
              id="avaliacao-media-anterior"
              ref={mediaAnteriorInputRef}
              type="text"
              inputMode="decimal"
              value={mediaAnteriorInput}
              onChange={(e) => {
                const v = e.target.value;
                setMediaAnteriorInput(v);
                setMaEmAndamento(v.trim() !== '');
              }}
              placeholder={
                maEmAndamento
                  ? 'Digite a média do mês anterior (ex: 72,50)'
                  : 'Em branco na 1ª medição (ou digite a MA)'
              }
              className="w-full px-3 py-2 text-base font-mono font-bold text-center text-slate-900 bg-white border border-slate-300 rounded-md focus:border-[#004A8F] focus:outline-none"
            />
            <p className="text-[11px] text-slate-600 leading-snug">
              {avaliacaoAnteriorMedicao?.avaliacaoDesempenho
                ? `Herdada automaticamente da MAA da Medição nº ${avaliacaoAnteriorMedicao.numero} (${formatNumberBR(
                    avaliacaoAnteriorMedicao.avaliacaoDesempenho.maa
                  )}), podendo ser ajustada manualmente.`
                : 'Se o contrato já está em andamento, digite manualmente a média acumulada do mês anterior (ex.: 72,50). Na 1ª avaliação do contrato, deixe em branco.'}
            </p>
          </div>

          <div className="p-4 flex flex-col justify-center items-center text-center bg-white">
            <div className="text-xs font-bold text-[#1B365D]">
              Nota Média no Período (NMA)
            </div>
            <div className="text-2xl font-mono font-bold text-[#004A8F] mt-1.5 tabular-nums">
              {formatNumberBR(calc.nma)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 font-mono">
              {formatNumberBR(calc.somaNotasFinais)} / 100 = {formatNumberBR(calc.nma)}
            </div>
          </div>

          <div className="p-4 flex flex-col justify-center items-center text-center bg-emerald-50/60">
            <div className="text-xs font-bold text-[#1B365D]">
              Média Atual Acumulada (MAA)
            </div>
            <div className="text-2xl font-mono font-bold text-emerald-700 mt-1.5 tabular-nums">
              {formatNumberBR(calc.maa)}
            </div>
            <div className="text-[11px] text-slate-600 mt-1 font-mono">
              {mediaAnteriorParsed !== null
                ? `(${formatNumberBR(mediaAnteriorParsed)} + ${formatNumberBR(calc.nma)}) / 2`
                : `Média(${formatNumberBR(calc.nma)}) = ${formatNumberBR(calc.maa)}`}
            </div>
          </div>
        </div>
      </div>

      {/* Compliance & Observations */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="text-xs font-bold text-slate-900">
            Quanto ao contrato: Deixou de cumprir alguma cláusula do contrato?
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setDescumpriuClausula(true)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border ${
                descumpriuClausula
                  ? 'bg-rose-600 text-white border-rose-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {descumpriuClausula && <Check className="w-3.5 h-3.5" />}
              <span>Sim*</span>
            </button>
            <button
              type="button"
              onClick={() => setDescumpriuClausula(false)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded border ${
                !descumpriuClausula
                  ? 'bg-[#004A8F] text-white border-[#003970]'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              {!descumpriuClausula && <Check className="w-3.5 h-3.5" />}
              <span>Não</span>
            </button>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
            <label className="text-xs font-bold text-[#1B365D] uppercase">
              Observações
            </label>
            {ncsAbertasContrato.length > 0 && (
              <button
                type="button"
                onClick={handlePreencherNCs}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded hover:bg-amber-100 no-print"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Citar {ncsAbertasContrato.length} NC(s) aberta(s) do contrato</span>
              </button>
            )}
          </div>
          <textarea
            rows={4}
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            placeholder="Descreva o que descumpriu da cláusula (se aplicável), notificações emitidas ou registros de desempenho no período..."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md focus:border-[#004A8F] focus:outline-none"
          />
          <p className="text-[11px] text-slate-500 italic mt-1">
            * Informar no campo de observações caso tenha havido descumprimento de cláusula.
          </p>
        </div>
      </div>

      {/* Physical Signatures Footer (Editable fields + Pen-signature line preview) */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 sm:p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Campos para Assinatura Física dos Avaliadores
            </h3>
            <p className="text-[11px] text-slate-500">
              Os campos abaixo são impressos com espaço em branco para assinatura física (caneta) e
              identificação técnica de cada avaliador.
            </p>
          </div>
          <div className="text-xs font-mono font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded">
            Data no rodapé: {formatDateBR(medicao.dataFim)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {avaliadores.map((av, idx) => (
            <div
              key={av.papel}
              className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/70 space-y-2.5"
            >
              <div className="text-xs font-bold text-[#1B365D] border-b border-slate-200 pb-1.5">
                {av.papel}
              </div>

              <div className="space-y-2 no-print">
                <input
                  value={av.nome}
                  onChange={(e) => updateAvaliador(idx, 'nome', e.target.value)}
                  placeholder="Nome completo"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
                <input
                  value={av.cargoRegistro}
                  onChange={(e) => updateAvaliador(idx, 'cargoRegistro', e.target.value)}
                  placeholder="Cargo / Registro (Ex.: Eng. Civil · CREA / CRT)"
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={av.matricula}
                    onChange={(e) => updateAvaliador(idx, 'matricula', e.target.value)}
                    placeholder="Matrícula"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                  />
                  <input
                    value={av.portaria}
                    onChange={(e) => updateAvaliador(idx, 'portaria', e.target.value)}
                    placeholder="Portaria"
                    className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                  />
                </div>
              </div>

              {/* Pen-signature box preview */}
              <div className="bg-white border border-slate-200 rounded p-3 pt-8 text-center">
                <div className="border-t border-slate-400 pt-1.5">
                  <div className="text-xs font-bold italic text-slate-900">
                    {av.nome.trim() || '________________________________'}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {av.cargoRegistro.trim() || 'Cargo / Registro'}
                  </div>
                  {av.matricula.trim() && (
                    <div className="text-[10px] text-slate-500">
                      Matrícula {av.matricula}
                    </div>
                  )}
                  {av.portaria.trim() && (
                    <div className="text-[10px] text-slate-500">{av.portaria}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmExcluirOpen}
        destructive
        title="Excluir Avaliação de Desempenho"
        description={`Tem certeza que deseja excluir os dados da Avaliação de Desempenho nº ${medicao.numero.toString().padStart(2, '0')}? Você poderá preenchê-la novamente a qualquer momento.`}
        confirmLabel="Excluir Avaliação"
        onCancel={() => setConfirmExcluirOpen(false)}
        onConfirm={async () => {
          setConfirmExcluirOpen(false);
          await deleteAvaliacaoDesempenho(medicao.id);
        }}
      />
    </div>
  );
}
