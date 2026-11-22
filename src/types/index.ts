export type ContratoStatus = 'ATIVO' | 'SUSPENSO' | 'ENCERRADO';

export interface ChecklistContrato {
  contratoAssinado: boolean;
  artRrt: boolean;
  cronograma: boolean;
  garantia: boolean;
  fiscalDesignado: boolean;
  gestorDesignado: boolean;
}

export interface Contrato {
  id: string;
  numero: string;
  processo: string;
  objeto: string;
  contratada: string;
  cnpj: string;
  gestor: string;
  fiscal: string;
  valorInicial: number;
  valorAtual: number;
  dataInicio: string;
  dataFim: string;
  status: ContratoStatus;
  municipio: string;
  latitude: number;
  longitude: number;
  checklist: ChecklistContrato;
  assinaturas?: AssinaturaEletronica[];
  planilhaOrigem?: {
    nomeArquivo: string;
    formato: 'XLSX' | 'PDF';
    dataImportacao: string;
    totalItens: number;
    valorTotal: number;
  };
}

export type TipoGarantia = 'SEGURO' | 'FIANCA' | 'CAUCAO';

export interface Garantia {
  id: string;
  contratoId: string;
  tipo: TipoGarantia;
  valor: number;
  inicio: string;
  fim: string;
  seguradora: string;
  apolice: string;
}

export type TipoAditivo = 'PRAZO' | 'VALOR';

export interface Aditivo {
  id: string;
  contratoId: string;
  numero: number;
  tipo: TipoAditivo;
  justificativa: string;
  valor: number;
  dias: number;
  dataAssinatura: string;
}

export type TipoDocumento =
  | 'CONTRATO'
  | 'ART'
  | 'RRT'
  | 'CRONOGRAMA'
  | 'ORCAMENTO'
  | 'MEDICAO'
  | 'MEMORIA'
  | 'NOTA_FISCAL'
  | 'NOTIFICACAO'
  | 'OFICIO';

export interface NotaFiscalInfo {
  numero: string;
  serie?: string;
  dataEmissao: string;
  valor: number;
  chaveAcesso?: string;
  arquivoUrl?: string;
  arquivoNome?: string;
}

export interface AssinaturaEletronica {
  id: string;
  nome: string;
  cargo: string;
  registro?: string;
  dataHora: string;
  hash?: string;
  assinaturaImagem?: string;
}

export interface Documento {
  id: string;
  contratoId: string;
  nome: string;
  tipo: TipoDocumento;
  url: string;
  dataUpload: string;
  tamanho?: string;
}

export interface EtapaCronograma {
  id: string;
  contratoId: string;
  descricao: string;
  percentual: number;
  inicio: string;
  fim: string;
  executado: number;
}

export interface ItemContrato {
  id: string;
  contratoId: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  valorTotal: number;
  fontePlanilha?: string;
}

export type StatusMedicao =
  | 'RASCUNHO'
  | 'EM_ANALISE'
  | 'APROVADA'
  | 'PROCESSO_PAGAMENTO'
  | 'PAGA'
  | 'REJEITADA';

export interface ItemMedido {
  id: string;
  itemContratoId: string;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidadeContratada: number;
  precoUnitario: number;
  saldoAnterior: number;
  quantidadeMedida: number;
  saldoAtual: number;
  valorMedido: number;
}

export interface MemoriaCalculo {
  id: string;
  medicaoId: string;
  descricao: string;
  formula: string;
  valor: number;
  unidade: string;
  local: string;
  fotoIds: string[];
}

export type CategoriaFoto =
  | 'FUNDAÇÃO'
  | 'ESTRUTURA'
  | 'ALVENARIA'
  | 'INSTALAÇÕES'
  | 'PAVIMENTAÇÃO'
  | 'COBERTURA'
  | 'ACABAMENTO';

export interface FotoMedicao {
  id: string;
  medicaoId: string;
  contratoId: string;
  categoria: CategoriaFoto;
  latitude: number;
  longitude: number;
  url: string;
  observacao: string;
  dataHora: string;
}

export interface ParecerFiscalMedicao {
  medicaoId: string;
  texto: string;
  conclusao: 'FAVORAVEL' | 'FAVORAVEL_COM_RESSALVAS' | 'DESFAVORAVEL';
  data: string;
  fiscal: string;
}

export type ConceitoAvaliacao = 'BOM' | 'REGULAR' | 'RUIM';

export interface AvaliacaoDesempenhoItem {
  id: string;
  codigo: number;
  titulo: string;
  peso: number;
  bom: number;
  regular: number;
  ruim: number;
  conceitoSelecionado?: ConceitoAvaliacao | null;
}

export interface AvaliadorDesempenho {
  papel: string;
  nome: string;
  cargoRegistro: string;
  matricula: string;
  portaria: string;
}

export interface AvaliacaoDesempenho {
  medicaoId: string;
  diretoria: string;
  regional: string;
  gerencia: string;
  unidade: string;
  endereco: string;
  bairro: string;
  cidade: string;
  cep: string;
  telefone: string;
  itens: AvaliacaoDesempenhoItem[];
  mediaAnterior: number | null;
  nma: number;
  maa: number;
  descumpriuClausula: boolean;
  observacoes: string;
  avaliadores: AvaliadorDesempenho[];
  atualizadoEm: string;
}

export interface Medicao {
  id: string;
  contratoId: string;
  numero: number;
  competencia: string;
  dataInicio: string;
  dataFim: string;
  valor: number;
  percentual: number;
  status: StatusMedicao;
  itensMedidos: ItemMedido[];
  memoriasCalculo: MemoriaCalculo[];
  fotos: FotoMedicao[];
  parecerFiscal?: ParecerFiscalMedicao;
  notaFiscal?: NotaFiscalInfo;
  assinaturas?: AssinaturaEletronica[];
  avaliacaoDesempenho?: AvaliacaoDesempenho;
}

export interface Clima {
  temperatura: number;
  umidade: number;
  chuva: boolean;
  velocidadeVento: number;
  observacao: string;
}

export interface Efetivo {
  id: string;
  categoria: string;
  quantidade: number;
}

export interface Equipamento {
  id: string;
  descricao: string;
  quantidade: number;
  operacional: boolean;
}

export interface AtividadeDiario {
  id: string;
  codigoItem?: string;
  descricao: string;
  local: string;
  percentual: number;
}

export type TipoOcorrencia =
  | 'QUALIDADE'
  | 'PRAZO'
  | 'SEGURANCA'
  | 'AMBIENTAL'
  | 'CONTRATUAL';

export type Criticidade = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface Ocorrencia {
  id: string;
  tipo: TipoOcorrencia;
  descricao: string;
  criticidade: Criticidade;
  ncGeradaId?: string;
}

export interface FotoDiario {
  id: string;
  diarioId: string;
  contratoId: string;
  url: string;
  descricao: string;
  categoria: CategoriaFoto;
  latitude: number;
  longitude: number;
  dataHora: string;
}

export interface Assinatura {
  id: string;
  nome: string;
  cargo: 'Fiscal' | 'Engenheiro Residente' | 'Representante da Contratada' | 'Gestor';
  registro?: string;
  dataHora: string;
  certificado: boolean;
  hash?: string;
  assinaturaImagem?: string;
}

export type StatusDiario = 'RASCUNHO' | 'SALVO' | 'FECHADO' | 'ASSINADO' | 'ARQUIVADO';

export interface DiarioObra {
  id: string;
  contratoId: string;
  data: string;
  clima: Clima;
  observacoes: string;
  paralisado: boolean;
  status: StatusDiario;
  efetivo: Efetivo[];
  equipamentos: Equipamento[];
  atividades: AtividadeDiario[];
  ocorrencias: Ocorrencia[];
  fotos: FotoDiario[];
  assinaturas: Assinatura[];
}

export type OrigemNC =
  | 'RDO'
  | 'MEDICAO'
  | 'AUDITORIA'
  | 'VISTORIA'
  | 'SEGURANCA'
  | 'AMBIENTAL'
  | 'DENUNCIA';

export type StatusNC =
  | 'ABERTA'
  | 'EM_TRATAMENTO'
  | 'CORRIGIDA'
  | 'VALIDADA'
  | 'ENCERRADA';

export type GravidadeNC = 'BAIXA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface PlanoAcao {
  what: string;
  why: string;
  where: string;
  when: string;
  who: string;
  how: string;
  howMuch: string;
}

export type TipoEvidencia = 'FOTO' | 'VIDEO' | 'PDF' | 'ATA' | 'OFICIO' | 'MEMORIAL';

export interface Evidencia {
  id: string;
  ncId: string;
  tipo: TipoEvidencia;
  descricao: string;
  url: string;
  data: string;
}

export interface HistoricoNC {
  id: string;
  ncId: string;
  data: string;
  usuario: string;
  descricao: string;
}

export interface NaoConformidade {
  id: string;
  contratoId: string;
  codigo: string;
  titulo: string;
  descricao: string;
  dataRegistro: string;
  dataLimite: string;
  origem: OrigemNC;
  status: StatusNC;
  gravidade: GravidadeNC;
  reincidente: boolean;
  dataEncerramento?: string;
  planoAcao?: PlanoAcao;
  evidencias: Evidencia[];
  historico: HistoricoNC[];
  assinaturas?: AssinaturaEletronica[];
}

export interface CertidaoFiscal {
  id: string;
  nome: string;
  orgao: string;
  codigoAutenticacao: string;
  validade: string;
  regular: boolean;
}

export interface ItemChecklistGEFISPAG {
  id: string;
  label: string;
  obrigatorio: boolean;
  conferido: boolean;
  observacao?: string;
}

export type StatusWorkflowGEFISPAG =
  | 'AUTUACAO'
  | 'CONFERENCIA_DOCUMENTAL'
  | 'PARECER_FISCAL'
  | 'PARECER_GESTOR'
  | 'LIQUIDACAO'
  | 'PAGO';

export interface ProcessoPagamentoGEFISPAG {
  id: string;
  numeroProcesso: string;
  contratoId: string;
  medicaoId: string;
  competencia: string;
  notaFiscal: string;
  valorBruto: number;
  retencoes: {
    inss: number;
    iss: number;
    irrf: number;
  };
  valorLiquido: number;
  statusWorkflow: StatusWorkflowGEFISPAG;
  checklistDocumental: ItemChecklistGEFISPAG[];
  certidoes: CertidaoFiscal[];
  parecerFiscal: string;
  parecerFiscalAprovado: boolean;
  parecerGestor: string;
  parecerGestorAprovado: boolean;
  dataAutuacao: string;
  dataPagamento?: string;
  notaFiscalInfo?: NotaFiscalInfo;
  assinaturas?: AssinaturaEletronica[];
}

export interface TermoRecebimento {
  id: string;
  contratoId: string;
  tipo: 'PROVISORIO' | 'DEFINITIVO';
  numero: string;
  dataEmissao: string;
  fiscalResponsavel: string;
  gestorResponsavel: string;
  representanteContratada: string;
  observacoes: string;
  status: 'RASCUNHO' | 'EMITIDO' | 'ASSINADO';
  assinaturas?: AssinaturaEletronica[];
}

export interface Auditoria {
  id: string;
  usuario: string;
  data: string;
  acao: string;
  entidade: string;
  entidadeId: string;
  detalhes: string;
}

export interface Alerta {
  id: string;
  tipo: 'VIGENCIA' | 'GARANTIA' | 'INCONFORMIDADE' | 'CHECKLIST' | 'PAGAMENTO';
  mensagem: string;
  nivel: 'INFO' | 'ALERTA' | 'CRITICO';
  contratoId?: string;
  entidadePath?: string;
}

export interface ConfiguracoesSistema {
  orgaoNome: string;
  secretaria: string;
  cidadeUf: string;
  fiscalPadrao: string;
  creaFiscal: string;
  gestorPadrao: string;
  alertaVigenciaDias: number;
  prazosNC: Record<GravidadeNC, number>;
}

export interface FiscalDatabase {
  contratos: Contrato[];
  aditivos: Aditivo[];
  garantias: Garantia[];
  documentos: Documento[];
  etapasCronograma: EtapaCronograma[];
  itensContrato: ItemContrato[];
  medicoes: Medicao[];
  diarios: DiarioObra[];
  naoConformidades: NaoConformidade[];
  processosGefispag: ProcessoPagamentoGEFISPAG[];
  recebimentos: TermoRecebimento[];
  auditoria: Auditoria[];
  configuracoes: ConfiguracoesSistema;
  assinaturasRelatorios?: AssinaturaEletronica[];
}
