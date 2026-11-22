import dayjs from 'dayjs';
import type {
  Aditivo,
  Alerta,
  AvaliacaoDesempenhoItem,
  CertidaoFiscal,
  ChecklistContrato,
  Contrato,
  Garantia,
  GravidadeNC,
  Medicao,
  NaoConformidade,
} from '../types';

export function calcularDiasRestantes(dataFim: string): number {
  return dayjs(dataFim).startOf('day').diff(dayjs().startOf('day'), 'day');
}

export function vigenciaColor(dias: number): 'error' | 'warning' | 'success' {
  if (dias <= 15) return 'error';
  if (dias <= 30) return 'warning';
  return 'success';
}

export function valorAtualizado(valorInicial: number, aditivosValores: number[]): number {
  return valorInicial + aditivosValores.reduce((acc, v) => acc + v, 0);
}

export function validarQuantidade(
  contratado: number,
  executadoAnterior: number,
  atual: number
): { valido: boolean; erro?: string } {
  if (atual < 0) {
    return { valido: false, erro: 'A quantidade medida não pode ser negativa.' };
  }
  if (executadoAnterior + atual > contratado + 0.0001) {
    return {
      valido: false,
      erro: `Quantidade superior ao contrato (${(executadoAnterior + atual).toFixed(2)} > ${contratado.toFixed(2)})`,
    };
  }
  return { valido: true };
}

export const formulas = {
  area: (a: number, b: number) => Number((a * b).toFixed(4)),
  volume: (c: number, l: number, h: number) => Number((c * l * h).toFixed(4)),
  comprimento: (a: number, b: number) => Number((a + b).toFixed(4)),
};

export function areaParede(comprimento: number, altura: number): number {
  return formulas.area(comprimento, altura);
}

export function percentualExecutado(contratoValor: number, executado: number): number {
  if (contratoValor <= 0) return 0;
  return Number(((executado / contratoValor) * 100).toFixed(2));
}

export function gerarCodigoNC(sequencial: number, ano = dayjs().year()): string {
  return `NC-${ano}-${sequencial.toString().padStart(4, '0')}`;
}

export const PRAZO_NC: Record<GravidadeNC, number> = {
  BAIXA: 15,
  MEDIA: 10,
  ALTA: 5,
  CRITICA: 2,
};

export function calcularPrazo(gravidade: GravidadeNC): number {
  return PRAZO_NC[gravidade];
}

export function podeMedir(ncs: NaoConformidade[]): boolean {
  const critica = ncs.find((nc) => nc.gravidade === 'CRITICA' && nc.status !== 'ENCERRADA');
  return !critica;
}

export function podePagar(ncs: NaoConformidade[]): boolean {
  return ncs.every((nc) => nc.status === 'ENCERRADA' || nc.gravidade === 'BAIXA');
}

export function calcularScoreContratada(ncs: NaoConformidade[]): number {
  const abertas = ncs.filter((nc) => nc.status !== 'ENCERRADA').length;
  const altas = ncs.filter((nc) => nc.gravidade === 'ALTA' && nc.status !== 'ENCERRADA').length;
  const criticas = ncs.filter(
    (nc) => nc.gravidade === 'CRITICA' && nc.status !== 'ENCERRADA'
  ).length;
  const raw = 100 - abertas * 2 - altas * 5 - criticas * 10;
  return Math.max(0, Math.min(100, raw));
}

export function calcularChecklistContrato(checklist: ChecklistContrato): {
  percentual: number;
  status: 'CONFORME' | 'ATENCAO' | 'CRITICO';
  itensFaltantes: string[];
} {
  const labels: Array<[keyof ChecklistContrato, string]> = [
    ['contratoAssinado', 'Contrato Assinado'],
    ['artRrt', 'ART / RRT'],
    ['cronograma', 'Cronograma Físico-Financeiro'],
    ['garantia', 'Garantia Contratual'],
    ['fiscalDesignado', 'Fiscal Designado'],
    ['gestorDesignado', 'Gestor Designado'],
  ];

  const faltantes = labels.filter(([key]) => !checklist[key]).map(([, label]) => label);
  const percentual = Math.round(((labels.length - faltantes.length) / labels.length) * 100);
  const status = percentual === 100 ? 'CONFORME' : percentual >= 70 ? 'ATENCAO' : 'CRITICO';
  return { percentual, status, itensFaltantes: faltantes };
}

export function validarGarantiaAtiva(garantias: Garantia[]): boolean {
  return garantias.some((g) => calcularDiasRestantes(g.fim) >= 0);
}

export function validarCertidoes(certidoes: CertidaoFiscal[]): boolean {
  return certidoes.every((c) => c.regular && calcularDiasRestantes(c.validade) >= 0);
}

export function gerarAlertasSistema(params: {
  contratos: Contrato[];
  garantias: Garantia[];
  ncs: NaoConformidade[];
  medicoes: Medicao[];
  alertaVigenciaDias?: number;
}): Alerta[] {
  const { contratos, garantias, ncs, alertaVigenciaDias = 30 } = params;
  const alertas: Alerta[] = [];

  for (const c of contratos) {
    if (c.status === 'ENCERRADO') continue;
    const dias = calcularDiasRestantes(c.dataFim);
    if (dias <= 0) {
      alertas.push({
        id: `alt-vig-exp-${c.id}`,
        tipo: 'VIGENCIA',
        mensagem: `Contrato ${c.numero} (${c.contratada}) com vigência vencida há ${Math.abs(dias)} dia(s).`,
        nivel: 'CRITICO',
        contratoId: c.id,
        entidadePath: `/contratos/${c.id}`,
      });
    } else if (dias <= alertaVigenciaDias) {
      alertas.push({
        id: `alt-vig-${c.id}`,
        tipo: 'VIGENCIA',
        mensagem: `Contrato ${c.numero} próximo ao vencimento (${dias} dias restantes).`,
        nivel: dias <= 15 ? 'CRITICO' : 'ALERTA',
        contratoId: c.id,
        entidadePath: `/contratos/${c.id}`,
      });
    }

    const chk = calcularChecklistContrato(c.checklist);
    if (chk.percentual < 100) {
      alertas.push({
        id: `alt-chk-${c.id}`,
        tipo: 'CHECKLIST',
        mensagem: `Contrato ${c.numero} com checklist documental em ${chk.percentual}% (${chk.itensFaltantes.join(', ')}).`,
        nivel: 'ALERTA',
        contratoId: c.id,
        entidadePath: `/contratos/${c.id}`,
      });
    }
  }

  for (const g of garantias) {
    const dias = calcularDiasRestantes(g.fim);
    if (dias <= 30) {
      alertas.push({
        id: `alt-gar-${g.id}`,
        tipo: 'GARANTIA',
        mensagem: `Garantia ${g.tipo} (${g.apolice}) ${dias <= 0 ? 'vencida' : `vence em ${dias} dias`}.`,
        nivel: dias <= 10 ? 'CRITICO' : 'ALERTA',
        contratoId: g.contratoId,
        entidadePath: `/garantias`,
      });
    }
  }

  for (const nc of ncs) {
    if (nc.status === 'ENCERRADA') continue;
    const dias = calcularDiasRestantes(nc.dataLimite);
    if (nc.gravidade === 'CRITICA') {
      alertas.push({
        id: `alt-nc-crit-${nc.id}`,
        tipo: 'INCONFORMIDADE',
        mensagem: `${nc.codigo} (${nc.titulo}) é CRÍTICA e bloqueia novas medições/pagamentos.`,
        nivel: 'CRITICO',
        contratoId: nc.contratoId,
        entidadePath: `/inconformidades`,
      });
    } else if (dias < 0) {
      alertas.push({
        id: `alt-nc-venc-${nc.id}`,
        tipo: 'INCONFORMIDADE',
        mensagem: `${nc.codigo} (${nc.titulo}) está com prazo de correção vencido há ${Math.abs(dias)} dia(s).`,
        nivel: 'ALERTA',
        contratoId: nc.contratoId,
        entidadePath: `/inconformidades`,
      });
    }
  }

  return alertas;
}

export function formatCurrencyBR(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '—';
  return dayjs(dateStr).format('DD/MM/YYYY');
}

export function formatNumberBR(value: number, decimals = 2): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function prazoNcStatus(nc: NaoConformidade): {
  label: string;
  tone: 'success' | 'warning' | 'error';
  diasRestantes: number;
} {
  if (nc.status === 'ENCERRADA' || nc.status === 'VALIDADA') {
    return { label: 'Resolvida', tone: 'success', diasRestantes: 0 };
  }
  const dias = calcularDiasRestantes(nc.dataLimite);
  if (dias < 0) {
    return { label: `Vencida (${Math.abs(dias)}d)`, tone: 'error', diasRestantes: dias };
  }
  if (dias <= 2) {
    return { label: `Prazo próximo (${dias}d)`, tone: 'warning', diasRestantes: dias };
  }
  return { label: `No prazo (${dias}d)`, tone: 'success', diasRestantes: dias };
}

export function calcularSaldoContrato(
  contrato: Contrato,
  aditivos: Aditivo[],
  medicoes: Medicao[]
): {
  valorInicial: number;
  totalAditivosValor: number;
  valorAtual: number;
  executado: number;
  saldo: number;
  percentual: number;
} {
  const aditivosValor = aditivos
    .filter((a) => a.contratoId === contrato.id && a.tipo === 'VALOR')
    .reduce((acc, a) => acc + a.valor, 0);
  const valorAtual = valorAtualizado(contrato.valorInicial, [aditivosValor]);
  const executado = medicoes
    .filter((m) => m.contratoId === contrato.id && m.status !== 'REJEITADA' && m.status !== 'RASCUNHO')
    .reduce((acc, m) => acc + m.valor, 0);
  const saldo = Math.max(0, valorAtual - executado);
  return {
    valorInicial: contrato.valorInicial,
    totalAditivosValor: aditivosValor,
    valorAtual,
    executado,
    saldo,
    percentual: percentualExecutado(valorAtual, executado),
  };
}

export const AVALIACAO_TOPICOS_PADRAO: Array<{
  id: string;
  codigo: number;
  titulo: string;
  peso: number;
}> = [
  { id: 'topico-1', codigo: 1, titulo: '1 - Qualidade da Execução', peso: 20 },
  { id: 'topico-2', codigo: 2, titulo: '2 - Estrutura de Logística', peso: 15 },
  { id: 'topico-3', codigo: 3, titulo: '3 - Gerenciamento', peso: 15 },
  { id: 'topico-4', codigo: 4, titulo: '4 - Experiência Equipe Técnica', peso: 15 },
  { id: 'topico-5', codigo: 5, titulo: '5 - Cumprimento dos Prazos', peso: 15 },
  {
    id: 'topico-6',
    codigo: 6,
    titulo: '6 - Segurança do Trabalho e Meio Ambiente',
    peso: 20,
  },
];

export function criarItensAvaliacaoPadrao(): AvaliacaoDesempenhoItem[] {
  return AVALIACAO_TOPICOS_PADRAO.map((t) => ({
    id: t.id,
    codigo: t.codigo,
    titulo: t.titulo,
    peso: t.peso,
    bom: 0,
    regular: 0,
    ruim: 0,
    conceitoSelecionado: null,
  }));
}

export function toRomanNumeral(num: number): string {
  if (!Number.isFinite(num) || num <= 0) return '—';
  const map: Array<[number, string]> = [
    [1000, 'M'],
    [900, 'CM'],
    [500, 'D'],
    [400, 'CD'],
    [100, 'C'],
    [90, 'XC'],
    [50, 'L'],
    [40, 'XL'],
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];
  let n = Math.floor(num);
  let out = '';
  for (const [val, sym] of map) {
    while (n >= val) {
      out += sym;
      n -= val;
    }
  }
  return out;
}

export function calcularAvaliacaoDesempenho(
  itens: AvaliacaoDesempenhoItem[],
  mediaAnterior: number | null
): {
  itensCalculados: Array<
    AvaliacaoDesempenhoItem & { somaNotas: number; notaFinal: number }
  >;
  somaPesos: number;
  somaNotasFinais: number;
  nma: number;
  maa: number;
} {
  const itensCalculados = itens.map((item) => {
    const bom = Number.isFinite(item.bom) ? item.bom : 0;
    const regular = Number.isFinite(item.regular) ? item.regular : 0;
    const ruim = Number.isFinite(item.ruim) ? item.ruim : 0;
    const somaNotas = Number((bom + regular + ruim).toFixed(4));
    const notaFinal = Number((somaNotas * item.peso).toFixed(2));
    return {
      ...item,
      bom,
      regular,
      ruim,
      somaNotas,
      notaFinal,
    };
  });

  const somaPesos = itensCalculados.reduce((acc, i) => acc + i.peso, 0);
  const somaNotasFinais = Number(
    itensCalculados.reduce((acc, i) => acc + i.notaFinal, 0).toFixed(2)
  );
  const nma = Number((somaNotasFinais / 100).toFixed(2));
  const maa =
    mediaAnterior !== null && Number.isFinite(mediaAnterior)
      ? Number(((mediaAnterior + nma) / 2).toFixed(2))
      : nma;

  return {
    itensCalculados,
    somaPesos,
    somaNotasFinais,
    nma,
    maa,
  };
}

