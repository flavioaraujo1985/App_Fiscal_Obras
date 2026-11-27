import dayjs from 'dayjs';
import { create } from 'zustand';
import { INITIAL_SEED_DATA } from '../data/seedData';
import { api } from '../services/api';
import { deviceStorage, extractLocalFileId, isLocalFileUrl } from '../services/deviceStorage';
import { gefispagService } from '../services/gefispag.service';
import type { ImportedPlanilhaItem } from '../services/spreadsheetImporter';
import type {
  Aditivo,
  AssinaturaEletronica,
  Auditoria,
  AvaliacaoDesempenho,
  ChecklistContrato,
  ConfiguracoesSistema,
  Contrato,
  DiarioObra,
  Documento,
  EtapaCronograma,
  FiscalDatabase,
  Garantia,
  GravidadeNC,
  ItemContrato,
  ItemMedido,
  Medicao,
  NaoConformidade,
  NotaFiscalInfo,
  Ocorrencia,
  PlanoAcao,
  ProcessoPagamentoGEFISPAG,
  StatusMedicao,
  StatusNC,
  StatusWorkflowGEFISPAG,
  TermoRecebimento,
} from '../types';
import {
  calcularPrazo,
  gerarCodigoNC,
  percentualExecutado,
  valorAtualizado,
} from '../utils/engineering';

interface ToastMessage {
  id: string;
  tipo: 'success' | 'error' | 'info';
  texto: string;
}

interface FiscalState {
  db: FiscalDatabase;
  loading: boolean;
  error: string | null;
  selectedContratoId: string | 'ALL';
  toasts: ToastMessage[];

  init: () => Promise<void>;
  setSelectedContratoId: (id: string | 'ALL') => void;
  pushToast: (tipo: ToastMessage['tipo'], texto: string) => void;
  dismissToast: (id: string) => void;
  resetDatabase: () => Promise<void>;
  exportBackup: () => Promise<void>;
  importBackup: (file: File) => Promise<void>;

  // Contratos
  addContrato: (contrato: Omit<Contrato, 'id' | 'valorAtual'>) => Promise<Contrato>;
  updateContrato: (id: string, patch: Partial<Contrato>) => Promise<void>;
  deleteContrato: (id: string) => Promise<void>;
  toggleChecklistContrato: (contratoId: string, field: keyof ChecklistContrato) => Promise<void>;
  addAditivo: (aditivo: Omit<Aditivo, 'id' | 'numero'>) => Promise<void>;
  updateAditivo: (
    id: string,
    patch: Partial<Pick<Aditivo, 'tipo' | 'valor' | 'dias' | 'dataAssinatura' | 'justificativa'>>
  ) => Promise<void>;
  deleteAditivo: (id: string) => Promise<void>;
  addGarantia: (garantia: Omit<Garantia, 'id'>) => Promise<void>;
  updateGarantia: (id: string, patch: Partial<Omit<Garantia, 'id' | 'contratoId'>>) => Promise<void>;
  deleteGarantia: (id: string) => Promise<void>;
  addDocumento: (documento: Omit<Documento, 'id'>) => Promise<void>;
  updateDocumento: (id: string, patch: Partial<Omit<Documento, 'id' | 'contratoId'>>) => Promise<void>;
  deleteDocumento: (id: string) => Promise<void>;
  addEtapaCronograma: (etapa: Omit<EtapaCronograma, 'id'>) => Promise<void>;
  updateEtapaCronograma: (id: string, executado: number) => Promise<void>;
  updateEtapaDetalhes: (
    id: string,
    patch: Partial<Omit<EtapaCronograma, 'id' | 'contratoId'>>
  ) => Promise<void>;
  deleteEtapaCronograma: (id: string) => Promise<void>;
  addItemContrato: (item: Omit<ItemContrato, 'id' | 'valorTotal'>) => Promise<void>;
  updateItemContrato: (
    id: string,
    patch: Partial<Pick<ItemContrato, 'codigo' | 'descricao' | 'unidade' | 'quantidade' | 'precoUnitario'>>
  ) => Promise<void>;
  deleteItemContrato: (id: string) => Promise<void>;
  importPlanilhaContrato: (payload: {
    contratoId: string;
    itens: ImportedPlanilhaItem[];
    modo: 'ACRESCENTAR' | 'SUBSTITUIR';
    atualizarValorContrato?: boolean;
    arquivo?: File;
    fonteNome?: string;
  }) => Promise<void>;

  // Medições
  addMedicao: (payload: {
    contratoId: string;
    competencia: string;
    dataInicio: string;
    dataFim: string;
  }) => Promise<Medicao>;
  updateMedicao: (id: string, patch: Partial<Medicao>, auditMsg?: string) => Promise<void>;
  deleteMedicao: (id: string) => Promise<void>;
  changeStatusMedicao: (id: string, status: StatusMedicao) => Promise<void>;
  addItemToMedicao: (payload: {
    medicaoId: string;
    itemContratoId?: string;
    codigo?: string;
    descricao?: string;
    unidade?: string;
    quantidadeContratada?: number;
    precoUnitario?: number;
    quantidadeMedida: number;
  }) => Promise<void>;
  syncContratoItensToMedicao: (medicaoId: string) => Promise<void>;
  importPlanilhaMedicao: (payload: {
    medicaoId: string;
    itens: ImportedPlanilhaItem[];
    modo: 'ACRESCENTAR' | 'SUBSTITUIR';
    atualizarValorContrato?: boolean;
    arquivo?: File;
  }) => Promise<void>;
  saveAvaliacaoDesempenho: (
    medicaoId: string,
    avaliacao: AvaliacaoDesempenho
  ) => Promise<void>;
  deleteAvaliacaoDesempenho: (medicaoId: string) => Promise<void>;

  // Diário de Obras
  addDiario: (diario: Omit<DiarioObra, 'id'>) => Promise<DiarioObra>;
  updateDiario: (id: string, patch: Partial<DiarioObra>, auditMsg?: string) => Promise<void>;
  deleteDiario: (id: string) => Promise<void>;
  addOcorrenciaDiario: (diarioId: string, ocorrencia: Omit<Ocorrencia, 'id'>) => Promise<void>;

  // Não Conformidades
  addNaoConformidade: (payload: {
    contratoId: string;
    titulo: string;
    descricao: string;
    origem: NaoConformidade['origem'];
    gravidade: GravidadeNC;
    reincidente?: boolean;
  }) => Promise<NaoConformidade>;
  updateNaoConformidade: (
    id: string,
    patch: Partial<
      Pick<
        NaoConformidade,
        'titulo' | 'descricao' | 'origem' | 'gravidade' | 'dataLimite' | 'reincidente'
      >
    >
  ) => Promise<void>;
  deleteNaoConformidade: (id: string) => Promise<void>;
  updateNcStatus: (id: string, status: StatusNC, observacao: string) => Promise<void>;
  saveNcPlanoAcao: (id: string, plano: PlanoAcao) => Promise<void>;
  addNcEvidencia: (
    id: string,
    evidencia: Omit<NaoConformidade['evidencias'][number], 'id' | 'ncId'>
  ) => Promise<void>;
  updateNcEvidencia: (
    ncId: string,
    evidenciaId: string,
    patch: Partial<Pick<NaoConformidade['evidencias'][number], 'tipo' | 'descricao' | 'url' | 'data'>>
  ) => Promise<void>;
  deleteNcEvidencia: (ncId: string, evidenciaId: string) => Promise<void>;

  // GEFISPAG & Nota Fiscal
  criarProcessoGefispag: (
    medicaoId: string,
    notaFiscal: string,
    notaFiscalInfo?: NotaFiscalInfo
  ) => Promise<ProcessoPagamentoGEFISPAG>;
  updateProcessoGefispag: (
    id: string,
    patch: Partial<ProcessoPagamentoGEFISPAG>,
    auditMsg?: string
  ) => Promise<void>;
  deleteProcessoGefispag: (id: string) => Promise<void>;
  avancarWorkflowGefispag: (id: string, nextStatus: StatusWorkflowGEFISPAG) => Promise<void>;
  saveNotaFiscalMedicao: (medicaoId: string, nf: NotaFiscalInfo) => Promise<void>;
  removeNotaFiscalMedicao: (medicaoId: string) => Promise<void>;
  saveNotaFiscalGefispag: (processoId: string, nf: NotaFiscalInfo) => Promise<void>;
  removeNotaFiscalGefispag: (processoId: string) => Promise<void>;

  // Assinaturas Eletrônicas
  addAssinaturaEntidade: (
    tipo: 'MEDICAO' | 'NC' | 'GEFISPAG' | 'RECEBIMENTO' | 'CONTRATO' | 'RELATORIO',
    id: string,
    assinatura: AssinaturaEletronica
  ) => Promise<void>;
  removeAssinaturaEntidade: (
    tipo: 'MEDICAO' | 'NC' | 'GEFISPAG' | 'RECEBIMENTO' | 'CONTRATO' | 'RELATORIO',
    id: string,
    assinaturaId: string
  ) => Promise<void>;

  // Recebimento & Configurações
  addRecebimento: (termo: Omit<TermoRecebimento, 'id'>) => Promise<void>;
  updateRecebimento: (
    id: string,
    patch: Partial<Omit<TermoRecebimento, 'id' | 'contratoId'>>
  ) => Promise<void>;
  deleteRecebimento: (id: string) => Promise<void>;
  updateRecebimentoStatus: (id: string, status: TermoRecebimento['status']) => Promise<void>;
  updateConfiguracoes: (cfg: ConfiguracoesSistema) => Promise<void>;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function sanitizeNonNegativeNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return fallback;
  return Number(num.toFixed(2));
}

function clampPercent(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.max(0, Math.min(100, num));
}

async function safeDeleteLocalFile(url?: string): Promise<void> {
  if (!url || !isLocalFileUrl(url)) return;
  try {
    await deviceStorage.deleteFile(extractLocalFileId(url));
  } catch {
    // Arquivo já removido ou inacessível localmente; não bloqueia a operação
  }
}

function recalcularPercentuaisMedicoesContrato(
  medicoes: Medicao[],
  contratoId: string,
  novoValorAtual: number
): Medicao[] {
  return medicoes.map((m) =>
    m.contratoId === contratoId
      ? { ...m, percentual: percentualExecutado(novoValorAtual, m.valor) }
      : m
  );
}

function makeAudit(
  usuario: string,
  acao: string,
  entidade: string,
  entidadeId: string,
  detalhes: string
): Auditoria {
  return {
    id: makeId('aud'),
    usuario,
    data: dayjs().format('YYYY-MM-DD'),
    acao,
    entidade,
    entidadeId,
    detalhes,
  };
}

export const useFiscalStore = create<FiscalState>((set, get) => {
  const toastTimers = new Map<string, ReturnType<typeof setTimeout>>();

  const persist = async (nextDb: FiscalDatabase) => {
    set({ db: nextDb });
    try {
      await deviceStorage.saveDatabaseLocal(nextDb);
    } catch (err) {
      get().pushToast(
        'error',
        err instanceof Error ? err.message : 'Falha ao salvar no armazenamento do dispositivo.'
      );
    }
    if (typeof navigator === 'undefined' || navigator.onLine) {
      api.saveDatabase(nextDb).catch(() => {
        // Offline ou servidor indisponível; dados mantidos localmente no dispositivo
      });
    }
  };

  return {
    db: INITIAL_SEED_DATA,
    loading: true,
    error: null,
    selectedContratoId: 'ALL',
    toasts: [],

    init: async () => {
      set({ loading: true, error: null });
      void deviceStorage.requestPersistence();
      try {
        const localDb = await deviceStorage.loadDatabaseLocal();
        if (localDb) {
          set({ db: localDb, loading: false });
          return;
        }
        let initialDb = structuredClone(INITIAL_SEED_DATA);
        if (typeof navigator === 'undefined' || navigator.onLine) {
          try {
            initialDb = await api.getDatabase();
          } catch {
            // Fallback para seed embutido quando offline
          }
        }
        await deviceStorage.saveDatabaseLocal(initialDb);
        set({ db: initialDb, loading: false });
      } catch (err) {
        set({
          db: structuredClone(INITIAL_SEED_DATA),
          loading: false,
          error: err instanceof Error ? err.message : 'Erro ao carregar dados locais.',
        });
      }
    },

    setSelectedContratoId: (id) => set({ selectedContratoId: id }),

    pushToast: (tipo, texto) => {
      const id = makeId('toast');
      set((s) => ({ toasts: [...s.toasts, { id, tipo, texto }] }));
      const timer = setTimeout(() => {
        toastTimers.delete(id);
        get().dismissToast(id);
      }, 4200);
      toastTimers.set(id, timer);
    },

    dismissToast: (id) => {
      const timer = toastTimers.get(id);
      if (timer) {
        clearTimeout(timer);
        toastTimers.delete(id);
      }
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    resetDatabase: async () => {
      await deviceStorage.clearAllFiles();
      const fresh = structuredClone(INITIAL_SEED_DATA);
      await deviceStorage.saveDatabaseLocal(fresh);
      if (typeof navigator === 'undefined' || navigator.onLine) {
        api.resetDatabase().catch(() => {});
      }
      set({ db: fresh, selectedContratoId: 'ALL' });
      get().pushToast('info', 'Armazenamento local restaurado para o cenário padrão.');
    },

    exportBackup: async () => {
      await deviceStorage.exportFullBackup(get().db);
      get().pushToast('success', 'Arquivo de backup salvo no dispositivo.');
    },

    importBackup: async (file) => {
      const restored = await deviceStorage.importFullBackup(file);
      set({ db: restored, selectedContratoId: 'ALL' });
      if (typeof navigator === 'undefined' || navigator.onLine) {
        api.saveDatabase(restored).catch(() => {});
      }
      get().pushToast('success', 'Backup e arquivos locais restaurados no dispositivo.');
    },

    addContrato: async (input) => {
      const { db } = get();
      const valorInicialSanitizado = sanitizeNonNegativeNumber(input.valorInicial);
      const novo: Contrato = {
        ...input,
        id: makeId('ctr'),
        valorInicial: valorInicialSanitizado,
        valorAtual: valorInicialSanitizado,
      };
      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'CADASTRO_CONTRATO',
        'CONTRATO',
        novo.id,
        `Contrato ${novo.numero} (${novo.contratada}) cadastrado.`
      );
      await persist({
        ...db,
        contratos: [novo, ...db.contratos],
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('success', `Contrato ${novo.numero} cadastrado.`);
      return novo;
    },

    updateContrato: async (id, patch) => {
      const { db } = get();
      const alvo = db.contratos.find((c) => c.id === id);
      if (!alvo) return;

      const valoresAditivos = db.aditivos
        .filter((a) => a.contratoId === id && a.tipo === 'VALOR')
        .map((a) => a.valor);

      const nextValorInicial =
        patch.valorInicial !== undefined
          ? sanitizeNonNegativeNumber(patch.valorInicial, alvo.valorInicial)
          : alvo.valorInicial;

      const nextValorAtual =
        patch.valorAtual !== undefined
          ? sanitizeNonNegativeNumber(patch.valorAtual, alvo.valorAtual)
          : patch.valorInicial !== undefined
          ? valorAtualizado(nextValorInicial, valoresAditivos)
          : alvo.valorAtual;

      const contratos = db.contratos.map((c) =>
        c.id === id
          ? { ...c, ...patch, valorInicial: nextValorInicial, valorAtual: nextValorAtual }
          : c
      );

      const medicoes =
        nextValorAtual !== alvo.valorAtual
          ? recalcularPercentuaisMedicoesContrato(db.medicoes, id, nextValorAtual)
          : db.medicoes;

      const audit = makeAudit(
        db.configuracoes.gestorPadrao,
        'EDICAO_CONTRATO',
        'CONTRATO',
        id,
        `Dados do Contrato ${patch.numero ?? alvo.numero} atualizados.`
      );
      await persist({ ...db, contratos, medicoes, auditoria: [audit, ...db.auditoria] });
      get().pushToast('success', 'Contrato atualizado.');
    },

    deleteContrato: async (id) => {
      const { db, selectedContratoId } = get();
      const contrato = db.contratos.find((c) => c.id === id);
      if (!contrato) return;

      const urlsParaRemover = new Set<string>();
      for (const doc of db.documentos) {
        if (doc.contratoId === id && isLocalFileUrl(doc.url)) urlsParaRemover.add(doc.url);
      }
      for (const m of db.medicoes) {
        if (m.contratoId !== id) continue;
        if (m.notaFiscal?.arquivoUrl && isLocalFileUrl(m.notaFiscal.arquivoUrl)) {
          urlsParaRemover.add(m.notaFiscal.arquivoUrl);
        }
        for (const f of m.fotos) {
          if (isLocalFileUrl(f.url)) urlsParaRemover.add(f.url);
        }
      }
      for (const d of db.diarios) {
        if (d.contratoId !== id) continue;
        for (const f of d.fotos) {
          if (isLocalFileUrl(f.url)) urlsParaRemover.add(f.url);
        }
      }
      for (const nc of db.naoConformidades) {
        if (nc.contratoId !== id) continue;
        for (const ev of nc.evidencias) {
          if (isLocalFileUrl(ev.url)) urlsParaRemover.add(ev.url);
        }
      }
      for (const p of db.processosGefispag) {
        if (
          p.contratoId === id &&
          p.notaFiscalInfo?.arquivoUrl &&
          isLocalFileUrl(p.notaFiscalInfo.arquivoUrl)
        ) {
          urlsParaRemover.add(p.notaFiscalInfo.arquivoUrl);
        }
      }

      await Promise.all([...urlsParaRemover].map((url) => safeDeleteLocalFile(url)));

      const audit = makeAudit(
        db.configuracoes.gestorPadrao,
        'EXCLUSAO_CONTRATO',
        'CONTRATO',
        id,
        `Contrato ${contrato.numero} (${contrato.contratada}) excluído com registros vinculados.`
      );

      if (selectedContratoId === id) {
        set({ selectedContratoId: 'ALL' });
      }

      await persist({
        ...db,
        contratos: db.contratos.filter((c) => c.id !== id),
        aditivos: db.aditivos.filter((a) => a.contratoId !== id),
        garantias: db.garantias.filter((g) => g.contratoId !== id),
        documentos: db.documentos.filter((d) => d.contratoId !== id),
        etapasCronograma: db.etapasCronograma.filter((e) => e.contratoId !== id),
        itensContrato: db.itensContrato.filter((i) => i.contratoId !== id),
        medicoes: db.medicoes.filter((m) => m.contratoId !== id),
        diarios: db.diarios.filter((d) => d.contratoId !== id),
        naoConformidades: db.naoConformidades.filter((nc) => nc.contratoId !== id),
        processosGefispag: db.processosGefispag.filter((p) => p.contratoId !== id),
        recebimentos: db.recebimentos.filter((r) => r.contratoId !== id),
        auditoria: [audit, ...db.auditoria],
      });

      get().pushToast('success', `Contrato ${contrato.numero} excluído.`);
    },

    toggleChecklistContrato: async (contratoId, field) => {
      const { db } = get();
      const contratos = db.contratos.map((c) =>
        c.id === contratoId
          ? { ...c, checklist: { ...c.checklist, [field]: !c.checklist[field] } }
          : c
      );
      await persist({ ...db, contratos });
    },

    addAditivo: async (input) => {
      const { db } = get();
      const existentes = db.aditivos.filter((a) => a.contratoId === input.contratoId);
      const novo: Aditivo = {
        ...input,
        id: makeId('adt'),
        numero: existentes.length + 1,
      };
      const aditivos = [...db.aditivos, novo];
      let novoValorAtual = 0;

      const contratos = db.contratos.map((c) => {
        if (c.id !== input.contratoId) return c;
        const valores = aditivos
          .filter((a) => a.contratoId === c.id && a.tipo === 'VALOR')
          .map((a) => a.valor);
        const novaDataFim =
          novo.tipo === 'PRAZO' && novo.dias > 0
            ? dayjs(c.dataFim).add(novo.dias, 'day').format('YYYY-MM-DD')
            : c.dataFim;
        novoValorAtual = valorAtualizado(c.valorInicial, valores);
        return {
          ...c,
          valorAtual: novoValorAtual,
          dataFim: novaDataFim,
        };
      });

      const medicoes =
        novo.tipo === 'VALOR'
          ? recalcularPercentuaisMedicoesContrato(db.medicoes, input.contratoId, novoValorAtual)
          : db.medicoes;

      const audit = makeAudit(
        db.configuracoes.gestorPadrao,
        'REGISTRO_ADITIVO',
        'ADITIVO',
        novo.id,
        `Termo Aditivo nº ${novo.numero} (${novo.tipo}) registrado.`
      );
      await persist({
        ...db,
        aditivos,
        contratos,
        medicoes,
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('success', `Aditivo nº ${novo.numero} registrado.`);
    },

    updateAditivo: async (id, patch) => {
      const { db } = get();
      const alvo = db.aditivos.find((a) => a.id === id);
      if (!alvo) return;
      const atualizado: Aditivo = { ...alvo, ...patch };
      const aditivos = db.aditivos.map((a) => (a.id === id ? atualizado : a));
      let novoValorAtual = 0;

      const contratos = db.contratos.map((c) => {
        if (c.id !== alvo.contratoId) return c;
        const valores = aditivos
          .filter((a) => a.contratoId === c.id && a.tipo === 'VALOR')
          .map((a) => a.valor);
        novoValorAtual = valorAtualizado(c.valorInicial, valores);
        return { ...c, valorAtual: novoValorAtual };
      });

      const medicoes = recalcularPercentuaisMedicoesContrato(
        db.medicoes,
        alvo.contratoId,
        novoValorAtual
      );

      const audit = makeAudit(
        db.configuracoes.gestorPadrao,
        'EDICAO_ADITIVO',
        'ADITIVO',
        id,
        `Termo Aditivo nº ${atualizado.numero} (${atualizado.tipo}) editado.`
      );
      await persist({
        ...db,
        aditivos,
        contratos,
        medicoes,
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('success', `Aditivo nº ${atualizado.numero} atualizado.`);
    },

    deleteAditivo: async (id) => {
      const { db } = get();
      const alvo = db.aditivos.find((a) => a.id === id);
      if (!alvo) return;
      const aditivos = db.aditivos.filter((a) => a.id !== id);
      let novoValorAtual = 0;

      const contratos = db.contratos.map((c) => {
        if (c.id !== alvo.contratoId) return c;
        const valores = aditivos
          .filter((a) => a.contratoId === c.id && a.tipo === 'VALOR')
          .map((a) => a.valor);
        novoValorAtual = valorAtualizado(c.valorInicial, valores);
        return { ...c, valorAtual: novoValorAtual };
      });

      const medicoes = recalcularPercentuaisMedicoesContrato(
        db.medicoes,
        alvo.contratoId,
        novoValorAtual
      );

      const audit = makeAudit(
        db.configuracoes.gestorPadrao,
        'EXCLUSAO_ADITIVO',
        'ADITIVO',
        id,
        `Termo Aditivo nº ${alvo.numero} (${alvo.tipo}) excluído.`
      );
      await persist({
        ...db,
        aditivos,
        contratos,
        medicoes,
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('info', `Aditivo nº ${alvo.numero} excluído.`);
    },

    addGarantia: async (input) => {
      const { db } = get();
      const nova: Garantia = { ...input, id: makeId('gar') };
      const contratos = db.contratos.map((c) =>
        c.id === input.contratoId
          ? { ...c, checklist: { ...c.checklist, garantia: true } }
          : c
      );
      await persist({ ...db, garantias: [nova, ...db.garantias], contratos });
      get().pushToast('success', 'Garantia contratual registrada.');
    },

    updateGarantia: async (id, patch) => {
      const { db } = get();
      const garantias = db.garantias.map((g) => (g.id === id ? { ...g, ...patch } : g));
      await persist({ ...db, garantias });
      get().pushToast('success', 'Garantia contratual atualizada.');
    },

    deleteGarantia: async (id) => {
      const { db } = get();
      const alvo = db.garantias.find((g) => g.id === id);
      if (!alvo) return;
      const garantias = db.garantias.filter((g) => g.id !== id);
      const aindaTem = garantias.some((g) => g.contratoId === alvo.contratoId);
      const contratos = db.contratos.map((c) =>
        c.id === alvo.contratoId
          ? { ...c, checklist: { ...c.checklist, garantia: aindaTem } }
          : c
      );
      await persist({ ...db, garantias, contratos });
      get().pushToast('info', 'Garantia contratual excluída.');
    },

    addDocumento: async (input) => {
      const { db } = get();
      const novo: Documento = { ...input, id: makeId('doc') };
      await persist({ ...db, documentos: [novo, ...db.documentos] });
      get().pushToast('success', `Documento "${novo.nome}" anexado.`);
    },

    updateDocumento: async (id, patch) => {
      const { db } = get();
      const alvo = db.documentos.find((d) => d.id === id);
      if (!alvo) return;
      if (patch.url && patch.url !== alvo.url) {
        await safeDeleteLocalFile(alvo.url);
      }
      const documentos = db.documentos.map((d) => (d.id === id ? { ...d, ...patch } : d));
      await persist({ ...db, documentos });
      get().pushToast('success', `Documento "${patch.nome ?? alvo.nome}" atualizado.`);
    },

    deleteDocumento: async (id) => {
      const { db } = get();
      const alvo = db.documentos.find((d) => d.id === id);
      if (!alvo) return;
      await safeDeleteLocalFile(alvo.url);
      const documentos = db.documentos.filter((d) => d.id !== id);
      await persist({ ...db, documentos });
      get().pushToast('info', `Documento "${alvo.nome}" excluído.`);
    },

    addEtapaCronograma: async (etapa) => {
      const { db } = get();
      const nova: EtapaCronograma = {
        ...etapa,
        id: makeId('etp'),
        executado: clampPercent(etapa.executado),
      };
      await persist({ ...db, etapasCronograma: [...db.etapasCronograma, nova] });
      get().pushToast('success', `Etapa "${nova.descricao}" adicionada ao cronograma.`);
    },

    updateEtapaCronograma: async (id, executado) => {
      const { db } = get();
      const etapasCronograma = db.etapasCronograma.map((e) =>
        e.id === id ? { ...e, executado: clampPercent(executado) } : e
      );
      await persist({ ...db, etapasCronograma });
    },

    updateEtapaDetalhes: async (id, patch) => {
      const { db } = get();
      const etapasCronograma = db.etapasCronograma.map((e) =>
        e.id === id
          ? {
              ...e,
              ...patch,
              executado:
                patch.executado !== undefined ? clampPercent(patch.executado) : e.executado,
            }
          : e
      );
      await persist({ ...db, etapasCronograma });
      get().pushToast('success', 'Etapa do cronograma atualizada.');
    },

    deleteEtapaCronograma: async (id) => {
      const { db } = get();
      const etapasCronograma = db.etapasCronograma.filter((e) => e.id !== id);
      await persist({ ...db, etapasCronograma });
      get().pushToast('info', 'Etapa do cronograma excluída.');
    },

    addItemContrato: async (input) => {
      const { db } = get();
      const qtd = sanitizeNonNegativeNumber(input.quantidade);
      const preco = sanitizeNonNegativeNumber(input.precoUnitario);
      const novo: ItemContrato = {
        ...input,
        id: makeId('ic'),
        quantidade: qtd,
        precoUnitario: preco,
        valorTotal: Number((qtd * preco).toFixed(2)),
      };
      await persist({ ...db, itensContrato: [...db.itensContrato, novo] });
      get().pushToast('success', `Item ${novo.codigo} adicionado à planilha.`);
    },

    updateItemContrato: async (id, patch) => {
      const { db } = get();
      const alvo = db.itensContrato.find((i) => i.id === id);
      if (!alvo) return;
      const qtd =
        patch.quantidade !== undefined
          ? sanitizeNonNegativeNumber(patch.quantidade, alvo.quantidade)
          : alvo.quantidade;
      const preco =
        patch.precoUnitario !== undefined
          ? sanitizeNonNegativeNumber(patch.precoUnitario, alvo.precoUnitario)
          : alvo.precoUnitario;
      const atualizado: ItemContrato = {
        ...alvo,
        ...patch,
        quantidade: qtd,
        precoUnitario: preco,
        valorTotal: Number((qtd * preco).toFixed(2)),
      };
      const itensContrato = db.itensContrato.map((i) => (i.id === id ? atualizado : i));
      const ctr = db.contratos.find((c) => c.id === alvo.contratoId);

      const medicoes = db.medicoes.map((m) => {
        if (m.contratoId !== alvo.contratoId || m.status !== 'RASCUNHO') return m;
        const temItem = m.itensMedidos.some((im) => im.itemContratoId === id);
        if (!temItem) return m;
        const jaMedidoOutros = db.medicoes
          .filter(
            (other) =>
              other.contratoId === alvo.contratoId &&
              other.id !== m.id &&
              other.status !== 'REJEITADA'
          )
          .flatMap((other) => other.itensMedidos)
          .filter((im) => im.itemContratoId === id)
          .reduce((acc, im) => acc + im.quantidadeMedida, 0);
        const saldoAnterior = Math.max(0, Number((qtd - jaMedidoOutros).toFixed(2)));
        const itensMedidos = m.itensMedidos.map((im) => {
          if (im.itemContratoId !== id) return im;
          const qtdMed = Math.min(saldoAnterior, im.quantidadeMedida);
          return {
            ...im,
            codigo: atualizado.codigo,
            descricao: atualizado.descricao,
            unidade: atualizado.unidade,
            quantidadeContratada: qtd,
            precoUnitario: preco,
            saldoAnterior,
            quantidadeMedida: qtdMed,
            saldoAtual: Number((saldoAnterior - qtdMed).toFixed(2)),
            valorMedido: Number((qtdMed * preco).toFixed(2)),
          };
        });
        const valor = Number(itensMedidos.reduce((acc, i) => acc + i.valorMedido, 0).toFixed(2));
        return {
          ...m,
          itensMedidos,
          valor,
          percentual: ctr ? percentualExecutado(ctr.valorAtual, valor) : m.percentual,
        };
      });

      await persist({ ...db, itensContrato, medicoes });
      get().pushToast('success', `Item ${atualizado.codigo} atualizado no banco da planilha.`);
    },

    deleteItemContrato: async (id) => {
      const { db } = get();
      const alvo = db.itensContrato.find((i) => i.id === id);
      if (!alvo) return;
      const itensContrato = db.itensContrato.filter((i) => i.id !== id);
      const ctr = db.contratos.find((c) => c.id === alvo.contratoId);

      const medicoes = db.medicoes.map((m) => {
        if (m.contratoId !== alvo.contratoId || m.status !== 'RASCUNHO') return m;
        const itensMedidos = m.itensMedidos.filter((im) => im.itemContratoId !== id);
        if (itensMedidos.length === m.itensMedidos.length) return m;
        const valor = Number(itensMedidos.reduce((acc, i) => acc + i.valorMedido, 0).toFixed(2));
        return {
          ...m,
          itensMedidos,
          valor,
          percentual: ctr ? percentualExecutado(ctr.valorAtual, valor) : m.percentual,
        };
      });

      await persist({ ...db, itensContrato, medicoes });
      get().pushToast('info', `Item ${alvo.codigo} removido do banco da planilha.`);
    },

    importPlanilhaContrato: async ({
      contratoId,
      itens,
      modo,
      atualizarValorContrato = false,
      arquivo,
      fonteNome,
    }) => {
      const { db } = get();
      const contrato = db.contratos.find((c) => c.id === contratoId);
      if (!contrato || itens.length === 0) return;

      const outrosItens = db.itensContrato.filter((i) => i.contratoId !== contratoId);
      let itensDoContrato =
        modo === 'SUBSTITUIR' ? [] : db.itensContrato.filter((i) => i.contratoId === contratoId);

      const nomeArquivoFinal =
        arquivo?.name ?? fonteNome ?? contrato.planilhaOrigem?.nomeArquivo ?? 'Planilha Importada';
      const formatoFinal: 'XLSX' | 'PDF' = nomeArquivoFinal.toLowerCase().endsWith('.pdf')
        ? 'PDF'
        : 'XLSX';

      itens.forEach((row, idx) => {
        const codigoNorm = row.codigo.trim().toLowerCase();
        const existenteIdx = itensDoContrato.findIndex(
          (ic) => ic.codigo.trim().toLowerCase() === codigoNorm
        );
        const qtd = sanitizeNonNegativeNumber(row.quantidadeContratada);
        const preco = sanitizeNonNegativeNumber(row.precoUnitario);
        const valorTotal = Number((qtd * preco).toFixed(2));

        if (existenteIdx >= 0) {
          itensDoContrato = itensDoContrato.map((ic, i) =>
            i === existenteIdx
              ? {
                  ...ic,
                  descricao: row.descricao.trim(),
                  unidade: row.unidade.trim() || ic.unidade,
                  quantidade: qtd,
                  precoUnitario: preco,
                  valorTotal,
                  fontePlanilha: nomeArquivoFinal,
                }
              : ic
          );
        } else {
          itensDoContrato.push({
            id: makeId(`ic-${idx}`),
            contratoId,
            codigo: row.codigo.trim(),
            descricao: row.descricao.trim(),
            unidade: row.unidade.trim() || 'un',
            quantidade: qtd,
            precoUnitario: preco,
            valorTotal,
            fontePlanilha: nomeArquivoFinal,
          });
        }
      });

      const nextItensContrato = [...outrosItens, ...itensDoContrato];
      const totalPlanilha = Number(
        itensDoContrato.reduce((acc, i) => acc + i.valorTotal, 0).toFixed(2)
      );

      const valoresAditivos = db.aditivos
        .filter((a) => a.contratoId === contratoId && a.tipo === 'VALOR')
        .map((a) => a.valor);
      const valorAtualContrato = atualizarValorContrato
        ? valorAtualizado(totalPlanilha, valoresAditivos)
        : contrato.valorAtual;

      const contratos = db.contratos.map((c) =>
        c.id === contratoId
          ? {
              ...c,
              valorInicial: atualizarValorContrato ? totalPlanilha : c.valorInicial,
              valorAtual: valorAtualContrato,
              planilhaOrigem: {
                nomeArquivo: nomeArquivoFinal,
                formato: formatoFinal,
                dataImportacao: dayjs().format('YYYY-MM-DD'),
                totalItens: itensDoContrato.length,
                valorTotal: totalPlanilha,
              },
            }
          : c
      );

      const medicoes = db.medicoes.map((m) => {
        if (m.contratoId !== contratoId || m.status !== 'RASCUNHO') return m;
        const itensMedidosAtualizados = m.itensMedidos.map((im) => {
          const ic = itensDoContrato.find(
            (i) =>
              i.id === im.itemContratoId ||
              i.codigo.trim().toLowerCase() === im.codigo.trim().toLowerCase()
          );
          if (!ic) return im;
          const jaMedidoOutros = db.medicoes
            .filter(
              (o) => o.contratoId === contratoId && o.id !== m.id && o.status !== 'REJEITADA'
            )
            .flatMap((o) => o.itensMedidos)
            .filter((oim) => oim.itemContratoId === ic.id)
            .reduce((acc, oim) => acc + oim.quantidadeMedida, 0);
          const saldoAnterior = Math.max(0, Number((ic.quantidade - jaMedidoOutros).toFixed(2)));
          const qtdMed = Math.min(saldoAnterior, im.quantidadeMedida);
          return {
            ...im,
            itemContratoId: ic.id,
            codigo: ic.codigo,
            descricao: ic.descricao,
            unidade: ic.unidade,
            quantidadeContratada: ic.quantidade,
            precoUnitario: ic.precoUnitario,
            saldoAnterior,
            quantidadeMedida: qtdMed,
            saldoAtual: Number((saldoAnterior - qtdMed).toFixed(2)),
            valorMedido: Number((qtdMed * ic.precoUnitario).toFixed(2)),
          };
        });
        const valor = Number(
          itensMedidosAtualizados.reduce((acc, i) => acc + i.valorMedido, 0).toFixed(2)
        );
        return {
          ...m,
          itensMedidos: itensMedidosAtualizados,
          valor,
          percentual: percentualExecutado(valorAtualContrato, valor),
        };
      });

      let documentos = db.documentos;
      if (arquivo) {
        try {
          const saved = await deviceStorage.saveFileToDevice(arquivo);
          const novoDoc: Documento = {
            id: makeId('doc-planilha'),
            contratoId,
            nome: arquivo.name,
            tipo: 'ORCAMENTO',
            url: saved.url,
            dataUpload: dayjs().format('YYYY-MM-DD'),
            tamanho: `${(arquivo.size / 1024).toFixed(0)} KB`,
          };
          documentos = [novoDoc, ...documentos];
        } catch {
          // Falha ao salvar arquivo anexo não bloqueia importação da planilha
        }
      }

      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'IMPORTACAO_PLANILHA',
        'CONTRATO',
        contratoId,
        `Planilha "${nomeArquivoFinal}" registrada como banco de dados (${itens.length} item(ns)) do Contrato ${contrato.numero}.`
      );

      await persist({
        ...db,
        contratos,
        itensContrato: nextItensContrato,
        medicoes,
        documentos,
        auditoria: [audit, ...db.auditoria],
      });

      get().pushToast(
        'success',
        `Planilha salva como banco de dados do contrato (${itensDoContrato.length} itens).`
      );
    },

    addMedicao: async ({ contratoId, competencia, dataInicio, dataFim }) => {
      const { db } = get();
      const contrato = db.contratos.find((c) => c.id === contratoId);
      if (!contrato) throw new Error('Contrato não encontrado.');

      const medicoesContrato = db.medicoes.filter((m) => m.contratoId === contratoId);
      const numero =
        medicoesContrato.length > 0
          ? Math.max(...medicoesContrato.map((m) => m.numero)) + 1
          : 1;

      const itensContrato = db.itensContrato.filter((i) => i.contratoId === contratoId);
      const itensMedidos = itensContrato.map((ic) => {
        const jaMedido = medicoesContrato
          .filter((m) => m.status !== 'REJEITADA')
          .flatMap((m) => m.itensMedidos)
          .filter((im) => im.itemContratoId === ic.id)
          .reduce((acc, im) => acc + im.quantidadeMedida, 0);
        const saldoAnterior = Math.max(0, Number((ic.quantidade - jaMedido).toFixed(2)));
        return {
          id: makeId(`im-${ic.id}`),
          itemContratoId: ic.id,
          codigo: ic.codigo,
          descricao: ic.descricao,
          unidade: ic.unidade,
          quantidadeContratada: ic.quantidade,
          precoUnitario: ic.precoUnitario,
          saldoAnterior,
          quantidadeMedida: 0,
          saldoAtual: saldoAnterior,
          valorMedido: 0,
        };
      });

      const nova: Medicao = {
        id: makeId('med'),
        contratoId,
        numero,
        competencia,
        dataInicio,
        dataFim,
        valor: 0,
        percentual: 0,
        status: 'RASCUNHO',
        itensMedidos,
        memoriasCalculo: [],
        fotos: [],
      };

      await persist({ ...db, medicoes: [nova, ...db.medicoes] });
      get().pushToast('success', `Boletim de Medição nº ${numero} criado em rascunho.`);
      return nova;
    },

    updateMedicao: async (id, patch, auditMsg) => {
      const { db } = get();
      const medicoes = db.medicoes.map((m) => (m.id === id ? { ...m, ...patch } : m));
      const auditoria = auditMsg
        ? [
            makeAudit(db.configuracoes.fiscalPadrao, 'ATUALIZACAO_MEDICAO', 'MEDICAO', id, auditMsg),
            ...db.auditoria,
          ]
        : db.auditoria;
      await persist({ ...db, medicoes, auditoria });
    },

    deleteMedicao: async (id) => {
      const { db } = get();
      const med = db.medicoes.find((m) => m.id === id);
      if (!med) return;
      const urls = new Set<string>();
      for (const f of med.fotos) {
        if (isLocalFileUrl(f.url)) urls.add(f.url);
      }
      if (med.notaFiscal?.arquivoUrl && isLocalFileUrl(med.notaFiscal.arquivoUrl)) {
        urls.add(med.notaFiscal.arquivoUrl);
      }
      for (const p of db.processosGefispag) {
        if (
          p.medicaoId === id &&
          p.notaFiscalInfo?.arquivoUrl &&
          isLocalFileUrl(p.notaFiscalInfo.arquivoUrl)
        ) {
          urls.add(p.notaFiscalInfo.arquivoUrl);
        }
      }
      await Promise.all([...urls].map((url) => safeDeleteLocalFile(url)));

      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'EXCLUSAO_MEDICAO',
        'MEDICAO',
        id,
        `Boletim de Medição nº ${med.numero} (${med.competencia}) excluído.`
      );
      await persist({
        ...db,
        medicoes: db.medicoes.filter((m) => m.id !== id),
        processosGefispag: db.processosGefispag.filter((p) => p.medicaoId !== id),
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('info', `Boletim de Medição nº ${med.numero} excluído.`);
    },

    changeStatusMedicao: async (id, status) => {
      const { db } = get();
      const med = db.medicoes.find((m) => m.id === id);
      if (!med) return;
      const medicoes = db.medicoes.map((m) => (m.id === id ? { ...m, status } : m));
      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        `MEDICAO_${status}`,
        'MEDICAO',
        id,
        `Medição nº ${med.numero} (${med.competencia}) alterada para ${status}.`
      );
      await persist({ ...db, medicoes, auditoria: [audit, ...db.auditoria] });
      get().pushToast('success', `Status da Medição nº ${med.numero} atualizado para ${status}.`);
    },

    addItemToMedicao: async (payload) => {
      const { db } = get();
      const med = db.medicoes.find((m) => m.id === payload.medicaoId);
      if (!med) return;
      const ctr = db.contratos.find((c) => c.id === med.contratoId);
      if (!ctr) return;

      let nextItensContrato = db.itensContrato;
      let targetItemContrato: ItemContrato | undefined;

      if (payload.itemContratoId) {
        targetItemContrato = db.itensContrato.find((i) => i.id === payload.itemContratoId);
      } else if (payload.codigo && payload.descricao) {
        const qtdCtr = sanitizeNonNegativeNumber(payload.quantidadeContratada, 1);
        const precoUnit = sanitizeNonNegativeNumber(payload.precoUnitario, 0);
        const novoItemCtr: ItemContrato = {
          id: makeId('ic'),
          contratoId: ctr.id,
          codigo: payload.codigo.trim(),
          descricao: payload.descricao.trim(),
          unidade: payload.unidade?.trim() || 'un',
          quantidade: qtdCtr,
          precoUnitario: precoUnit,
          valorTotal: Number((qtdCtr * precoUnit).toFixed(2)),
        };
        nextItensContrato = [...db.itensContrato, novoItemCtr];
        targetItemContrato = novoItemCtr;
      }

      if (!targetItemContrato) return;

      const jaMedidoOutros = db.medicoes
        .filter((m) => m.contratoId === ctr.id && m.id !== med.id && m.status !== 'REJEITADA')
        .flatMap((m) => m.itensMedidos)
        .filter((im) => im.itemContratoId === targetItemContrato!.id)
        .reduce((acc, im) => acc + im.quantidadeMedida, 0);

      const saldoAnterior = Math.max(
        0,
        Number((targetItemContrato.quantidade - jaMedidoOutros).toFixed(2))
      );
      const qtdMedida = sanitizeNonNegativeNumber(payload.quantidadeMedida);
      if (qtdMedida > saldoAnterior) {
        get().pushToast(
          'error',
          `Quantidade (${qtdMedida}) excede o saldo disponível (${saldoAnterior} ${targetItemContrato.unidade}).`
        );
        return;
      }

      const existingIdx = med.itensMedidos.findIndex(
        (i) => i.itemContratoId === targetItemContrato!.id
      );

      let novosItensMedidos: ItemMedido[];
      if (existingIdx >= 0) {
        novosItensMedidos = med.itensMedidos.map((item, idx) =>
          idx === existingIdx
            ? {
                ...item,
                quantidadeMedida: qtdMedida,
                saldoAtual: Number((item.saldoAnterior - qtdMedida).toFixed(2)),
                valorMedido: Number((qtdMedida * item.precoUnitario).toFixed(2)),
              }
            : item
        );
      } else {
        const novoItemMedido: ItemMedido = {
          id: makeId(`im-${targetItemContrato.id}`),
          itemContratoId: targetItemContrato.id,
          codigo: targetItemContrato.codigo,
          descricao: targetItemContrato.descricao,
          unidade: targetItemContrato.unidade,
          quantidadeContratada: targetItemContrato.quantidade,
          precoUnitario: targetItemContrato.precoUnitario,
          saldoAnterior,
          quantidadeMedida: qtdMedida,
          saldoAtual: Number((saldoAnterior - qtdMedida).toFixed(2)),
          valorMedido: Number((qtdMedida * targetItemContrato.precoUnitario).toFixed(2)),
        };
        novosItensMedidos = [...med.itensMedidos, novoItemMedido];
      }

      const valorTotalMedicao = Number(
        novosItensMedidos.reduce((acc, i) => acc + i.valorMedido, 0).toFixed(2)
      );
      const perc = percentualExecutado(ctr.valorAtual, valorTotalMedicao);

      const medicoes = db.medicoes.map((m) =>
        m.id === med.id
          ? {
              ...m,
              itensMedidos: novosItensMedidos,
              valor: valorTotalMedicao,
              percentual: perc,
            }
          : m
      );

      await persist({ ...db, itensContrato: nextItensContrato, medicoes });
      get().pushToast('success', `Item ${targetItemContrato.codigo} inserido na medição.`);
    },

    syncContratoItensToMedicao: async (medicaoId) => {
      const { db } = get();
      const med = db.medicoes.find((m) => m.id === medicaoId);
      if (!med) return;
      const ctr = db.contratos.find((c) => c.id === med.contratoId);
      if (!ctr) return;

      const itensContrato = db.itensContrato.filter((i) => i.contratoId === ctr.id);
      const existentesIds = new Set(med.itensMedidos.map((i) => i.itemContratoId));
      const faltantes = itensContrato.filter((i) => !existentesIds.has(i.id));
      if (faltantes.length === 0) {
        get().pushToast('info', 'Todos os itens da planilha já estão nesta medição.');
        return;
      }

      const adicionados: ItemMedido[] = faltantes.map((ic) => {
        const jaMedido = db.medicoes
          .filter((m) => m.contratoId === ctr.id && m.id !== med.id && m.status !== 'REJEITADA')
          .flatMap((m) => m.itensMedidos)
          .filter((im) => im.itemContratoId === ic.id)
          .reduce((acc, im) => acc + im.quantidadeMedida, 0);
        const saldoAnterior = Math.max(0, Number((ic.quantidade - jaMedido).toFixed(2)));
        return {
          id: makeId(`im-${ic.id}`),
          itemContratoId: ic.id,
          codigo: ic.codigo,
          descricao: ic.descricao,
          unidade: ic.unidade,
          quantidadeContratada: ic.quantidade,
          precoUnitario: ic.precoUnitario,
          saldoAnterior,
          quantidadeMedida: 0,
          saldoAtual: saldoAnterior,
          valorMedido: 0,
        };
      });

      const medicoes = db.medicoes.map((m) =>
        m.id === med.id
          ? { ...m, itensMedidos: [...m.itensMedidos, ...adicionados] }
          : m
      );
      await persist({ ...db, medicoes });
      get().pushToast('success', `${adicionados.length} item(ns) sincronizado(s) do contrato.`);
    },

    importPlanilhaMedicao: async ({
      medicaoId,
      itens,
      modo,
      atualizarValorContrato = false,
      arquivo,
    }) => {
      const { db } = get();
      const med = db.medicoes.find((m) => m.id === medicaoId);
      if (!med) return;
      const ctr = db.contratos.find((c) => c.id === med.contratoId);
      if (!ctr || itens.length === 0) return;

      const outrosItensContrato = db.itensContrato.filter((i) => i.contratoId !== ctr.id);
      let itensDoContrato = db.itensContrato.filter((i) => i.contratoId === ctr.id);

      let novosItensMedidos: ItemMedido[] =
        modo === 'SUBSTITUIR' ? [] : [...med.itensMedidos];
      let ajustesSaldo = 0;

      itens.forEach((row, idx) => {
        const codigoTrim = row.codigo.trim();
        const codigoNorm = codigoTrim.toLowerCase();
        const qtdContratada = sanitizeNonNegativeNumber(row.quantidadeContratada);
        const precoUnit = sanitizeNonNegativeNumber(row.precoUnitario);
        const valorTotalItem = Number((qtdContratada * precoUnit).toFixed(2));

        let ic = itensDoContrato.find((i) => i.codigo.trim().toLowerCase() === codigoNorm);
        if (ic) {
          const nextQtd = qtdContratada > 0 ? qtdContratada : ic.quantidade;
          const nextPreco = precoUnit > 0 ? precoUnit : ic.precoUnitario;
          ic = {
            ...ic,
            descricao: row.descricao.trim(),
            unidade: row.unidade.trim() || ic.unidade,
            quantidade: nextQtd,
            precoUnitario: nextPreco,
            valorTotal: Number((nextQtd * nextPreco).toFixed(2)),
          };
          itensDoContrato = itensDoContrato.map((existing) =>
            existing.id === ic!.id ? ic! : existing
          );
        } else {
          ic = {
            id: makeId(`ic-${idx}`),
            contratoId: ctr.id,
            codigo: codigoTrim,
            descricao: row.descricao.trim(),
            unidade: row.unidade.trim() || 'un',
            quantidade: qtdContratada,
            precoUnitario: precoUnit,
            valorTotal: valorTotalItem,
          };
          itensDoContrato.push(ic);
        }

        const jaMedidoOutros = db.medicoes
          .filter((m) => m.contratoId === ctr.id && m.id !== med.id && m.status !== 'REJEITADA')
          .flatMap((m) => m.itensMedidos)
          .filter((im) => im.itemContratoId === ic!.id)
          .reduce((acc, im) => acc + im.quantidadeMedida, 0);

        const saldoAnterior = Math.max(0, Number((ic.quantidade - jaMedidoOutros).toFixed(2)));
        let qtdMedida = sanitizeNonNegativeNumber(row.quantidadeMedida ?? 0);
        if (qtdMedida > saldoAnterior) {
          qtdMedida = saldoAnterior;
          ajustesSaldo += 1;
        }
        const saldoAtual = Number((saldoAnterior - qtdMedida).toFixed(2));
        const valorMedido = Number((qtdMedida * ic.precoUnitario).toFixed(2));

        const existingMedIdx = novosItensMedidos.findIndex(
          (im) => im.itemContratoId === ic!.id || im.codigo.trim().toLowerCase() === codigoNorm
        );

        const novoItemMedido: ItemMedido = {
          id: existingMedIdx >= 0 ? novosItensMedidos[existingMedIdx].id : makeId(`im-${idx}`),
          itemContratoId: ic.id,
          codigo: ic.codigo,
          descricao: ic.descricao,
          unidade: ic.unidade,
          quantidadeContratada: ic.quantidade,
          precoUnitario: ic.precoUnitario,
          saldoAnterior,
          quantidadeMedida: qtdMedida,
          saldoAtual,
          valorMedido,
        };

        if (existingMedIdx >= 0) {
          novosItensMedidos[existingMedIdx] = novoItemMedido;
        } else {
          novosItensMedidos.push(novoItemMedido);
        }
      });

      const nextItensContrato = [...outrosItensContrato, ...itensDoContrato];
      const totalPlanilha = Number(
        itensDoContrato.reduce((acc, i) => acc + i.valorTotal, 0).toFixed(2)
      );
      const nomeArquivoFinal =
        arquivo?.name ?? ctr.planilhaOrigem?.nomeArquivo ?? 'Planilha de Medição Importada';
      const formatoFinal: 'XLSX' | 'PDF' = nomeArquivoFinal.toLowerCase().endsWith('.pdf')
        ? 'PDF'
        : 'XLSX';

      const valoresAditivos = db.aditivos
        .filter((a) => a.contratoId === ctr.id && a.tipo === 'VALOR')
        .map((a) => a.valor);
      const contratoValorAtual = atualizarValorContrato
        ? valorAtualizado(totalPlanilha, valoresAditivos)
        : ctr.valorAtual;

      const contratos = db.contratos.map((c) =>
        c.id === ctr.id
          ? {
              ...c,
              valorInicial: atualizarValorContrato ? totalPlanilha : c.valorInicial,
              valorAtual: contratoValorAtual,
              planilhaOrigem: {
                nomeArquivo: nomeArquivoFinal,
                formato: formatoFinal,
                dataImportacao: dayjs().format('YYYY-MM-DD'),
                totalItens: itensDoContrato.length,
                valorTotal: totalPlanilha,
              },
            }
          : c
      );

      const valorTotalMedicao = Number(
        novosItensMedidos.reduce((acc, i) => acc + i.valorMedido, 0).toFixed(2)
      );
      const perc = percentualExecutado(contratoValorAtual, valorTotalMedicao);

      let medicoes = db.medicoes.map((m) =>
        m.id === med.id
          ? {
              ...m,
              itensMedidos: novosItensMedidos,
              valor: valorTotalMedicao,
              percentual: perc,
            }
          : m
      );

      if (contratoValorAtual !== ctr.valorAtual) {
        medicoes = medicoes.map((m) =>
          m.contratoId === ctr.id && m.id !== med.id
            ? { ...m, percentual: percentualExecutado(contratoValorAtual, m.valor) }
            : m
        );
      }

      let documentos = db.documentos;
      if (arquivo) {
        try {
          const saved = await deviceStorage.saveFileToDevice(arquivo);
          const novoDoc: Documento = {
            id: makeId('doc-med'),
            contratoId: ctr.id,
            nome: arquivo.name,
            tipo: 'MEDICAO',
            url: saved.url,
            dataUpload: dayjs().format('YYYY-MM-DD'),
            tamanho: `${(arquivo.size / 1024).toFixed(0)} KB`,
          };
          documentos = [novoDoc, ...documentos];
        } catch {
          // Falha não bloqueia a importação
        }
      }

      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'IMPORTACAO_PLANILHA_MEDICAO',
        'MEDICAO',
        med.id,
        `${itens.length} item(ns) importado(s) na Medição nº ${med.numero} (${ctr.numero}).`
      );

      await persist({
        ...db,
        contratos,
        itensContrato: nextItensContrato,
        medicoes,
        documentos,
        auditoria: [audit, ...db.auditoria],
      });

      const extraMsg =
        ajustesSaldo > 0
          ? ` (${ajustesSaldo} item(ns) ajustado(s) ao saldo disponível.)`
          : '';
      get().pushToast(
        'success',
        `Planilha importada com ${itens.length} item(ns) na Medição nº ${med.numero}.${extraMsg}`
      );
    },

    addDiario: async (input) => {
      const { db } = get();
      const novo: DiarioObra = { ...input, id: makeId('rdo') };
      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'CRIACAO_RDO',
        'DIARIO_OBRA',
        novo.id,
        `RDO de ${dayjs(novo.data).format('DD/MM/YYYY')} criado.`
      );
      await persist({
        ...db,
        diarios: [novo, ...db.diarios],
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('success', 'Relatório Diário de Obra registrado.');
      return novo;
    },

    updateDiario: async (id, patch, auditMsg) => {
      const { db } = get();
      const diarios = db.diarios.map((d) => (d.id === id ? { ...d, ...patch } : d));
      const auditoria = auditMsg
        ? [
            makeAudit(db.configuracoes.fiscalPadrao, 'ATUALIZACAO_RDO', 'DIARIO_OBRA', id, auditMsg),
            ...db.auditoria,
          ]
        : db.auditoria;
      await persist({ ...db, diarios, auditoria });
    },

    deleteDiario: async (id) => {
      const { db } = get();
      const diario = db.diarios.find((d) => d.id === id);
      if (!diario) return;
      await Promise.all(diario.fotos.map((f) => safeDeleteLocalFile(f.url)));

      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'EXCLUSAO_RDO',
        'DIARIO_OBRA',
        id,
        `RDO de ${dayjs(diario.data).format('DD/MM/YYYY')} excluído.`
      );
      await persist({
        ...db,
        diarios: db.diarios.filter((d) => d.id !== id),
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('info', `RDO de ${dayjs(diario.data).format('DD/MM/YYYY')} excluído.`);
    },

    addOcorrenciaDiario: async (diarioId, ocorrenciaInput) => {
      const { db } = get();
      const diario = db.diarios.find((d) => d.id === diarioId);
      if (!diario) return;

      let ncGeradaId: string | undefined;
      let naoConformidades = db.naoConformidades;
      let auditoria = db.auditoria;

      if (ocorrenciaInput.criticidade === 'ALTA' || ocorrenciaInput.criticidade === 'CRITICA') {
        const seq = db.naoConformidades.length + 1;
        const gravidade: GravidadeNC =
          ocorrenciaInput.criticidade === 'CRITICA' ? 'CRITICA' : 'ALTA';
        const dias = db.configuracoes.prazosNC[gravidade] ?? calcularPrazo(gravidade);
        const hoje = dayjs().format('YYYY-MM-DD');
        const ncId = makeId('nc');
        const novaNc: NaoConformidade = {
          id: ncId,
          contratoId: diario.contratoId,
          codigo: gerarCodigoNC(seq),
          titulo: ocorrenciaInput.descricao.slice(0, 72),
          descricao: ocorrenciaInput.descricao,
          dataRegistro: hoje,
          dataLimite: dayjs().add(dias, 'day').format('YYYY-MM-DD'),
          origem: 'RDO',
          status: 'ABERTA',
          gravidade,
          reincidente: false,
          evidencias: [],
          historico: [
            {
              id: makeId('hnc'),
              ncId,
              data: hoje,
              usuario: db.configuracoes.fiscalPadrao,
              descricao: `NC gerada automaticamente por ocorrência ${ocorrenciaInput.criticidade} no RDO de ${dayjs(diario.data).format('DD/MM/YYYY')}.`,
            },
          ],
        };
        ncGeradaId = ncId;
        naoConformidades = [novaNc, ...naoConformidades];
        auditoria = [
          makeAudit(
            db.configuracoes.fiscalPadrao,
            'ABERTURA_AUTOMATICA_NC',
            'NAO_CONFORMIDADE',
            novaNc.id,
            `${novaNc.codigo} gerada automaticamente via RDO.`
          ),
          ...auditoria,
        ];
        get().pushToast(
          'info',
          `${novaNc.codigo} criada automaticamente pela criticidade da ocorrência.`
        );
      }

      const novaOcorrencia: Ocorrencia = {
        ...ocorrenciaInput,
        id: makeId('oc'),
        ncGeradaId,
      };
      const diarios = db.diarios.map((d) =>
        d.id === diarioId ? { ...d, ocorrencias: [...d.ocorrencias, novaOcorrencia] } : d
      );
      await persist({ ...db, diarios, naoConformidades, auditoria });
    },

    addNaoConformidade: async (payload) => {
      const { db } = get();
      const seq = db.naoConformidades.length + 1;
      const dias = db.configuracoes.prazosNC[payload.gravidade] ?? calcularPrazo(payload.gravidade);
      const hoje = dayjs().format('YYYY-MM-DD');
      const ncId = makeId('nc');
      const nova: NaoConformidade = {
        id: ncId,
        contratoId: payload.contratoId,
        codigo: gerarCodigoNC(seq),
        titulo: payload.titulo,
        descricao: payload.descricao,
        dataRegistro: hoje,
        dataLimite: dayjs().add(dias, 'day').format('YYYY-MM-DD'),
        origem: payload.origem,
        status: 'ABERTA',
        gravidade: payload.gravidade,
        reincidente: Boolean(payload.reincidente),
        evidencias: [],
        historico: [
          {
            id: makeId('hnc'),
            ncId,
            data: hoje,
            usuario: db.configuracoes.fiscalPadrao,
            descricao: `Não conformidade registrada (${payload.origem} · Gravidade ${payload.gravidade}).`,
          },
        ],
      };
      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'ABERTURA_NC',
        'NAO_CONFORMIDADE',
        nova.id,
        `${nova.codigo} — ${nova.titulo}`
      );
      await persist({
        ...db,
        naoConformidades: [nova, ...db.naoConformidades],
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('success', `${nova.codigo} registrada.`);
      return nova;
    },

    updateNaoConformidade: async (id, patch) => {
      const { db } = get();
      const alvo = db.naoConformidades.find((n) => n.id === id);
      if (!alvo) return;
      const hoje = dayjs().format('YYYY-MM-DD');
      const naoConformidades = db.naoConformidades.map((nc) =>
        nc.id === id
          ? {
              ...nc,
              ...patch,
              historico: [
                ...nc.historico,
                {
                  id: makeId('hnc'),
                  ncId: id,
                  data: hoje,
                  usuario: db.configuracoes.fiscalPadrao,
                  descricao: 'Dados da não conformidade editados.',
                },
              ],
            }
          : nc
      );
      await persist({ ...db, naoConformidades });
      get().pushToast('success', `${alvo.codigo} atualizada.`);
    },

    deleteNaoConformidade: async (id) => {
      const { db } = get();
      const alvo = db.naoConformidades.find((n) => n.id === id);
      if (!alvo) return;
      await Promise.all(alvo.evidencias.map((ev) => safeDeleteLocalFile(ev.url)));

      const diarios = db.diarios.map((d) => ({
        ...d,
        ocorrencias: d.ocorrencias.map((oc) =>
          oc.ncGeradaId === id ? { ...oc, ncGeradaId: undefined } : oc
        ),
      }));
      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'EXCLUSAO_NC',
        'NAO_CONFORMIDADE',
        id,
        `${alvo.codigo} (${alvo.titulo}) excluída.`
      );
      await persist({
        ...db,
        naoConformidades: db.naoConformidades.filter((n) => n.id !== id),
        diarios,
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('info', `${alvo.codigo} excluída.`);
    },

    updateNcStatus: async (id, status, observacao) => {
      const { db } = get();
      const hoje = dayjs().format('YYYY-MM-DD');
      const naoConformidades = db.naoConformidades.map((nc) => {
        if (nc.id !== id) return nc;
        return {
          ...nc,
          status,
          dataEncerramento: status === 'ENCERRADA' ? hoje : nc.dataEncerramento,
          historico: [
            ...nc.historico,
            {
              id: makeId('hnc'),
              ncId: id,
              data: hoje,
              usuario: db.configuracoes.fiscalPadrao,
              descricao: observacao,
            },
          ],
        };
      });
      await persist({ ...db, naoConformidades });
      get().pushToast('success', `Status da NC atualizado para ${status}.`);
    },

    saveNcPlanoAcao: async (id, plano) => {
      const { db } = get();
      const naoConformidades = db.naoConformidades.map((nc) =>
        nc.id === id
          ? {
              ...nc,
              planoAcao: plano,
              status: nc.status === 'ABERTA' ? 'EM_TRATAMENTO' : nc.status,
              historico: [
                ...nc.historico,
                {
                  id: makeId('hnc'),
                  ncId: id,
                  data: dayjs().format('YYYY-MM-DD'),
                  usuario: db.configuracoes.fiscalPadrao,
                  descricao: 'Plano de ação 5W2H atualizado.',
                },
              ],
            }
          : nc
      );
      await persist({ ...db, naoConformidades });
      get().pushToast('success', 'Plano de ação 5W2H salvo.');
    },

    addNcEvidencia: async (id, evInput) => {
      const { db } = get();
      const naoConformidades = db.naoConformidades.map((nc) =>
        nc.id === id
          ? {
              ...nc,
              evidencias: [...nc.evidencias, { ...evInput, id: makeId('ev'), ncId: id }],
            }
          : nc
      );
      await persist({ ...db, naoConformidades });
      get().pushToast('success', 'Evidência anexada à não conformidade.');
    },

    updateNcEvidencia: async (ncId, evidenciaId, patch) => {
      const { db } = get();
      const nc = db.naoConformidades.find((n) => n.id === ncId);
      const oldEv = nc?.evidencias.find((e) => e.id === evidenciaId);
      if (oldEv && patch.url && patch.url !== oldEv.url) {
        await safeDeleteLocalFile(oldEv.url);
      }
      const naoConformidades = db.naoConformidades.map((item) =>
        item.id === ncId
          ? {
              ...item,
              evidencias: item.evidencias.map((ev) =>
                ev.id === evidenciaId ? { ...ev, ...patch } : ev
              ),
            }
          : item
      );
      await persist({ ...db, naoConformidades });
      get().pushToast('success', 'Evidência atualizada.');
    },

    deleteNcEvidencia: async (ncId, evidenciaId) => {
      const { db } = get();
      const nc = db.naoConformidades.find((n) => n.id === ncId);
      const oldEv = nc?.evidencias.find((e) => e.id === evidenciaId);
      if (oldEv) {
        await safeDeleteLocalFile(oldEv.url);
      }
      const naoConformidades = db.naoConformidades.map((item) =>
        item.id === ncId
          ? {
              ...item,
              evidencias: item.evidencias.filter((ev) => ev.id !== evidenciaId),
            }
          : item
      );
      await persist({ ...db, naoConformidades });
      get().pushToast('info', 'Evidência removida.');
    },

    criarProcessoGefispag: async (medicaoId, notaFiscal, notaFiscalInfo) => {
      const { db } = get();
      const med = db.medicoes.find((m) => m.id === medicaoId);
      if (!med) throw new Error('Medição não encontrada.');
      const ret = gefispagService.calcularRetencoesPadrao(med.valor);
      const nfFinal: NotaFiscalInfo = notaFiscalInfo ??
        med.notaFiscal ?? {
          numero: notaFiscal.trim() || 'NF-e Pendente',
          dataEmissao: dayjs().format('YYYY-MM-DD'),
          valor: med.valor,
        };
      const proc: ProcessoPagamentoGEFISPAG = {
        id: makeId('gef'),
        numeroProcesso: `GEFISPAG-${dayjs().year()}/${(db.processosGefispag.length + 893)
          .toString()
          .padStart(4, '0')}`,
        contratoId: med.contratoId,
        medicaoId: med.id,
        competencia: med.competencia,
        notaFiscal: nfFinal.numero,
        notaFiscalInfo: nfFinal,
        valorBruto: med.valor,
        retencoes: { inss: ret.inss, iss: ret.iss, irrf: ret.irrf },
        valorLiquido: ret.valorLiquido,
        statusWorkflow: 'AUTUACAO',
        checklistDocumental: [
          {
            id: 'cd-1',
            label: 'Nota Fiscal Eletrônica de Serviços atestada',
            obrigatorio: true,
            conferido: true,
          },
          {
            id: 'cd-2',
            label: `Boletim de Medição nº ${med.numero} assinado`,
            obrigatorio: true,
            conferido: true,
          },
          {
            id: 'cd-3',
            label: 'Memória de Cálculo analítica anexa',
            obrigatorio: true,
            conferido: med.memoriasCalculo.length > 0,
          },
          {
            id: 'cd-4',
            label: 'Relatório Fotográfico Georreferenciado',
            obrigatorio: true,
            conferido: med.fotos.length > 0,
          },
          {
            id: 'cd-5',
            label: 'Relatórios Diários de Obra (RDO) do período',
            obrigatorio: true,
            conferido: true,
          },
          {
            id: 'cd-6',
            label: 'Guia GFIP/SEFIP e Folha de Pagamento da Obra',
            obrigatorio: true,
            conferido: false,
          },
        ],
        certidoes: [
          {
            id: makeId('c1'),
            nome: 'CND Federal / PGFN',
            orgao: 'Receita Federal do Brasil',
            codigoAutenticacao: 'RFB-2026-8812',
            validade: dayjs().add(60, 'day').format('YYYY-MM-DD'),
            regular: true,
          },
          {
            id: makeId('c2'),
            nome: 'CRF — Regularidade do FGTS',
            orgao: 'Caixa Econômica Federal',
            codigoAutenticacao: 'CEF-2026-4410',
            validade: dayjs().add(25, 'day').format('YYYY-MM-DD'),
            regular: true,
          },
          {
            id: makeId('c3'),
            nome: 'CNDT — Débitos Trabalhistas',
            orgao: 'TST',
            codigoAutenticacao: 'TST-2026-7719',
            validade: dayjs().add(90, 'day').format('YYYY-MM-DD'),
            regular: true,
          },
        ],
        parecerFiscal: med.parecerFiscal?.texto ?? '',
        parecerFiscalAprovado: Boolean(med.parecerFiscal),
        parecerGestor: '',
        parecerGestorAprovado: false,
        dataAutuacao: dayjs().format('YYYY-MM-DD'),
        assinaturas: med.assinaturas ? [...med.assinaturas] : [],
      };

      const medicoes = db.medicoes.map((m) =>
        m.id === medicaoId ? { ...m, status: 'PROCESSO_PAGAMENTO' as const } : m
      );
      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'AUTUACAO_GEFISPAG',
        'GEFISPAG',
        proc.id,
        `Processo ${proc.numeroProcesso} autuado para Medição nº ${med.numero}.`
      );
      await persist({
        ...db,
        processosGefispag: [proc, ...db.processosGefispag],
        medicoes,
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('success', `Processo ${proc.numeroProcesso} autuado no GEFISPAG.`);
      return proc;
    },

    updateProcessoGefispag: async (id, patch, auditMsg) => {
      const { db } = get();
      const processosGefispag = db.processosGefispag.map((p) =>
        p.id === id ? { ...p, ...patch } : p
      );
      const auditoria = auditMsg
        ? [
            makeAudit(
              db.configuracoes.gestorPadrao,
              'ATUALIZACAO_GEFISPAG',
              'GEFISPAG',
              id,
              auditMsg
            ),
            ...db.auditoria,
          ]
        : db.auditoria;
      await persist({ ...db, processosGefispag, auditoria });
    },

    deleteProcessoGefispag: async (id) => {
      const { db } = get();
      const proc = db.processosGefispag.find((p) => p.id === id);
      if (!proc) return;
      await safeDeleteLocalFile(proc.notaFiscalInfo?.arquivoUrl);

      const medicoes = db.medicoes.map((m) =>
        m.id === proc.medicaoId && m.status !== 'REJEITADA'
          ? { ...m, status: 'APROVADA' as const }
          : m
      );
      const audit = makeAudit(
        db.configuracoes.gestorPadrao,
        'EXCLUSAO_GEFISPAG',
        'GEFISPAG',
        id,
        `Processo ${proc.numeroProcesso} excluído.`
      );
      await persist({
        ...db,
        processosGefispag: db.processosGefispag.filter((p) => p.id !== id),
        medicoes,
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('info', `Processo ${proc.numeroProcesso} excluído.`);
    },

    avancarWorkflowGefispag: async (id, nextStatus) => {
      const { db } = get();
      const proc = db.processosGefispag.find((p) => p.id === id);
      if (!proc) return;
      const processosGefispag = db.processosGefispag.map((p) =>
        p.id === id
          ? {
              ...p,
              statusWorkflow: nextStatus,
              dataPagamento: nextStatus === 'PAGO' ? dayjs().format('YYYY-MM-DD') : p.dataPagamento,
            }
          : p
      );
      const medicoes =
        nextStatus === 'PAGO'
          ? db.medicoes.map((m) =>
              m.id === proc.medicaoId ? { ...m, status: 'PAGA' as const } : m
            )
          : db.medicoes;
      const audit = makeAudit(
        db.configuracoes.gestorPadrao,
        `GEFISPAG_${nextStatus}`,
        'GEFISPAG',
        id,
        `${proc.numeroProcesso} avançou para etapa ${nextStatus}.`
      );
      await persist({ ...db, processosGefispag, medicoes, auditoria: [audit, ...db.auditoria] });
      get().pushToast('success', `${proc.numeroProcesso} atualizado para ${nextStatus}.`);
    },

    addRecebimento: async (input) => {
      const { db } = get();
      const novo: TermoRecebimento = { ...input, id: makeId('rec') };
      const contratos =
        novo.tipo === 'DEFINITIVO' && novo.status === 'ASSINADO'
          ? db.contratos.map((c) =>
              c.id === novo.contratoId ? { ...c, status: 'ENCERRADO' as const } : c
            )
          : db.contratos;
      await persist({
        ...db,
        recebimentos: [novo, ...db.recebimentos],
        contratos,
      });
      get().pushToast('success', `Termo de Recebimento ${novo.numero} emitido.`);
    },

    updateRecebimento: async (id, patch) => {
      const { db } = get();
      const alvo = db.recebimentos.find((r) => r.id === id);
      if (!alvo) return;
      const atualizado: TermoRecebimento = { ...alvo, ...patch };
      const recebimentos = db.recebimentos.map((r) => (r.id === id ? atualizado : r));
      const contratos =
        atualizado.tipo === 'DEFINITIVO' && atualizado.status === 'ASSINADO'
          ? db.contratos.map((c) =>
              c.id === atualizado.contratoId ? { ...c, status: 'ENCERRADO' as const } : c
            )
          : db.contratos;
      await persist({ ...db, recebimentos, contratos });
      get().pushToast('success', `Termo ${atualizado.numero} atualizado.`);
    },

    deleteRecebimento: async (id) => {
      const { db } = get();
      const alvo = db.recebimentos.find((r) => r.id === id);
      if (!alvo) return;
      const audit = makeAudit(
        db.configuracoes.gestorPadrao,
        'EXCLUSAO_RECEBIMENTO',
        'RECEBIMENTO',
        id,
        `Termo de Recebimento ${alvo.numero} excluído.`
      );
      await persist({
        ...db,
        recebimentos: db.recebimentos.filter((r) => r.id !== id),
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('info', `Termo ${alvo.numero} excluído.`);
    },

    updateRecebimentoStatus: async (id, status) => {
      const { db } = get();
      const rec = db.recebimentos.find((r) => r.id === id);
      if (!rec) return;
      const recebimentos = db.recebimentos.map((r) => (r.id === id ? { ...r, status } : r));
      const contratos =
        rec.tipo === 'DEFINITIVO' && status === 'ASSINADO'
          ? db.contratos.map((c) =>
              c.id === rec.contratoId ? { ...c, status: 'ENCERRADO' as const } : c
            )
          : db.contratos;
      await persist({ ...db, recebimentos, contratos });
      get().pushToast('success', `Termo ${rec.numero} marcado como ${status}.`);
    },

    updateConfiguracoes: async (cfg) => {
      const { db } = get();
      await persist({ ...db, configuracoes: cfg });
      get().pushToast('success', 'Configurações do sistema salvas.');
    },

    saveNotaFiscalMedicao: async (medicaoId, nf) => {
      const { db } = get();
      const med = db.medicoes.find((m) => m.id === medicaoId);
      if (!med) return;

      if (
        med.notaFiscal?.arquivoUrl &&
        nf.arquivoUrl &&
        med.notaFiscal.arquivoUrl !== nf.arquivoUrl
      ) {
        await safeDeleteLocalFile(med.notaFiscal.arquivoUrl);
      }

      const medicoes = db.medicoes.map((m) =>
        m.id === medicaoId ? { ...m, notaFiscal: nf } : m
      );
      const processosGefispag = db.processosGefispag.map((p) =>
        p.medicaoId === medicaoId ? { ...p, notaFiscal: nf.numero, notaFiscalInfo: nf } : p
      );

      let documentos = db.documentos;
      if (nf.arquivoUrl) {
        const docNome = `${nf.numero} — Medição nº ${med.numero}`;
        const existingIdx = documentos.findIndex(
          (d) => d.contratoId === med.contratoId && d.tipo === 'NOTA_FISCAL' && d.nome === docNome
        );
        const novoDoc: Documento = {
          id: existingIdx >= 0 ? documentos[existingIdx].id : makeId('doc-nf'),
          contratoId: med.contratoId,
          nome: docNome,
          tipo: 'NOTA_FISCAL',
          url: nf.arquivoUrl,
          dataUpload: nf.dataEmissao,
          tamanho: nf.arquivoNome ?? 'Anexo local',
        };
        documentos =
          existingIdx >= 0
            ? documentos.map((d, idx) => (idx === existingIdx ? novoDoc : d))
            : [novoDoc, ...documentos];
      }

      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'REGISTRO_NOTA_FISCAL',
        'MEDICAO',
        medicaoId,
        `Nota Fiscal ${nf.numero} registrada na Medição nº ${med.numero}.`
      );
      await persist({
        ...db,
        medicoes,
        processosGefispag,
        documentos,
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('success', `Nota Fiscal ${nf.numero} salva na medição.`);
    },

    removeNotaFiscalMedicao: async (medicaoId) => {
      const { db } = get();
      const med = db.medicoes.find((m) => m.id === medicaoId);
      if (!med) return;
      await safeDeleteLocalFile(med.notaFiscal?.arquivoUrl);

      const medicoes = db.medicoes.map((m) =>
        m.id === medicaoId ? { ...m, notaFiscal: undefined } : m
      );
      const processosGefispag = db.processosGefispag.map((p) =>
        p.medicaoId === medicaoId
          ? { ...p, notaFiscal: 'NF-e Pendente', notaFiscalInfo: undefined }
          : p
      );
      await persist({ ...db, medicoes, processosGefispag });
      get().pushToast('info', 'Nota Fiscal removida da medição.');
    },

    saveNotaFiscalGefispag: async (processoId, nf) => {
      const { db } = get();
      const proc = db.processosGefispag.find((p) => p.id === processoId);
      if (!proc) return;

      if (
        proc.notaFiscalInfo?.arquivoUrl &&
        nf.arquivoUrl &&
        proc.notaFiscalInfo.arquivoUrl !== nf.arquivoUrl
      ) {
        await safeDeleteLocalFile(proc.notaFiscalInfo.arquivoUrl);
      }

      const processosGefispag = db.processosGefispag.map((p) =>
        p.id === processoId ? { ...p, notaFiscal: nf.numero, notaFiscalInfo: nf } : p
      );
      const medicoes = db.medicoes.map((m) =>
        m.id === proc.medicaoId ? { ...m, notaFiscal: nf } : m
      );

      let documentos = db.documentos;
      if (nf.arquivoUrl) {
        const docNome = `${nf.numero} — ${proc.numeroProcesso}`;
        const existingIdx = documentos.findIndex(
          (d) =>
            d.contratoId === proc.contratoId && d.tipo === 'NOTA_FISCAL' && d.nome === docNome
        );
        const novoDoc: Documento = {
          id: existingIdx >= 0 ? documentos[existingIdx].id : makeId('doc-nf'),
          contratoId: proc.contratoId,
          nome: docNome,
          tipo: 'NOTA_FISCAL',
          url: nf.arquivoUrl,
          dataUpload: nf.dataEmissao,
          tamanho: nf.arquivoNome ?? 'Anexo local',
        };
        documentos =
          existingIdx >= 0
            ? documentos.map((d, idx) => (idx === existingIdx ? novoDoc : d))
            : [novoDoc, ...documentos];
      }

      const audit = makeAudit(
        db.configuracoes.gestorPadrao,
        'REGISTRO_NOTA_FISCAL',
        'GEFISPAG',
        processoId,
        `Nota Fiscal ${nf.numero} vinculada ao processo ${proc.numeroProcesso}.`
      );
      await persist({
        ...db,
        processosGefispag,
        medicoes,
        documentos,
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast('success', `Nota Fiscal ${nf.numero} salva no processo.`);
    },

    removeNotaFiscalGefispag: async (processoId) => {
      const { db } = get();
      const proc = db.processosGefispag.find((p) => p.id === processoId);
      if (!proc) return;
      await safeDeleteLocalFile(proc.notaFiscalInfo?.arquivoUrl);

      const processosGefispag = db.processosGefispag.map((p) =>
        p.id === processoId
          ? { ...p, notaFiscal: 'NF-e Pendente', notaFiscalInfo: undefined }
          : p
      );
      const medicoes = db.medicoes.map((m) =>
        m.id === proc.medicaoId ? { ...m, notaFiscal: undefined } : m
      );
      await persist({ ...db, processosGefispag, medicoes });
      get().pushToast('info', 'Nota Fiscal removida do processo.');
    },

    addAssinaturaEntidade: async (tipo, id, assinatura) => {
      const { db } = get();
      const nextDb: FiscalDatabase = { ...db };

      if (tipo === 'MEDICAO') {
        nextDb.medicoes = db.medicoes.map((m) =>
          m.id === id ? { ...m, assinaturas: [...(m.assinaturas ?? []), assinatura] } : m
        );
      } else if (tipo === 'NC') {
        nextDb.naoConformidades = db.naoConformidades.map((n) =>
          n.id === id ? { ...n, assinaturas: [...(n.assinaturas ?? []), assinatura] } : n
        );
      } else if (tipo === 'GEFISPAG') {
        nextDb.processosGefispag = db.processosGefispag.map((p) =>
          p.id === id ? { ...p, assinaturas: [...(p.assinaturas ?? []), assinatura] } : p
        );
      } else if (tipo === 'RECEBIMENTO') {
        nextDb.recebimentos = db.recebimentos.map((r) =>
          r.id === id ? { ...r, assinaturas: [...(r.assinaturas ?? []), assinatura] } : r
        );
      } else if (tipo === 'CONTRATO') {
        nextDb.contratos = db.contratos.map((c) =>
          c.id === id ? { ...c, assinaturas: [...(c.assinaturas ?? []), assinatura] } : c
        );
      } else if (tipo === 'RELATORIO') {
        nextDb.assinaturasRelatorios = [...(db.assinaturasRelatorios ?? []), assinatura];
      }

      const audit = makeAudit(
        assinatura.nome,
        'CAMPO_ASSINATURA',
        tipo,
        id,
        `Campo de assinatura adicionado: ${assinatura.nome} (${assinatura.cargo}).`
      );
      nextDb.auditoria = [audit, ...db.auditoria];
      await persist(nextDb);
      get().pushToast('success', `Campo de assinatura de ${assinatura.nome} adicionado.`);
    },

    removeAssinaturaEntidade: async (tipo, id, assinaturaId) => {
      const { db } = get();
      const nextDb: FiscalDatabase = { ...db };

      if (tipo === 'MEDICAO') {
        nextDb.medicoes = db.medicoes.map((m) =>
          m.id === id
            ? { ...m, assinaturas: (m.assinaturas ?? []).filter((a) => a.id !== assinaturaId) }
            : m
        );
      } else if (tipo === 'NC') {
        nextDb.naoConformidades = db.naoConformidades.map((n) =>
          n.id === id
            ? { ...n, assinaturas: (n.assinaturas ?? []).filter((a) => a.id !== assinaturaId) }
            : n
        );
      } else if (tipo === 'GEFISPAG') {
        nextDb.processosGefispag = db.processosGefispag.map((p) =>
          p.id === id
            ? { ...p, assinaturas: (p.assinaturas ?? []).filter((a) => a.id !== assinaturaId) }
            : p
        );
      } else if (tipo === 'RECEBIMENTO') {
        nextDb.recebimentos = db.recebimentos.map((r) =>
          r.id === id
            ? { ...r, assinaturas: (r.assinaturas ?? []).filter((a) => a.id !== assinaturaId) }
            : r
        );
      } else if (tipo === 'CONTRATO') {
        nextDb.contratos = db.contratos.map((c) =>
          c.id === id
            ? { ...c, assinaturas: (c.assinaturas ?? []).filter((a) => a.id !== assinaturaId) }
            : c
        );
      } else if (tipo === 'RELATORIO') {
        nextDb.assinaturasRelatorios = (db.assinaturasRelatorios ?? []).filter(
          (a) => a.id !== assinaturaId
        );
      }

      await persist(nextDb);
      get().pushToast('info', 'Assinatura removida.');
    },

    saveAvaliacaoDesempenho: async (medicaoId, avaliacao) => {
      const { db } = get();
      const med = db.medicoes.find((m) => m.id === medicaoId);
      if (!med) return;
      const medicoes = db.medicoes.map((m) =>
        m.id === medicaoId ? { ...m, avaliacaoDesempenho: avaliacao } : m
      );
      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'AVALIACAO_DESEMPENHO',
        'MEDICAO',
        medicaoId,
        `Avaliação de Desempenho nº ${med.numero.toString().padStart(2, '0')} salva (NMA ${avaliacao.nma.toFixed(2)} · MAA ${avaliacao.maa.toFixed(2)}).`
      );
      await persist({
        ...db,
        medicoes,
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast(
        'success',
        `Avaliação de Desempenho nº ${med.numero.toString().padStart(2, '0')} salva.`
      );
    },

    deleteAvaliacaoDesempenho: async (medicaoId) => {
      const { db } = get();
      const med = db.medicoes.find((m) => m.id === medicaoId);
      if (!med || !med.avaliacaoDesempenho) return;
      const medicoes = db.medicoes.map((m) =>
        m.id === medicaoId ? { ...m, avaliacaoDesempenho: undefined } : m
      );
      const audit = makeAudit(
        db.configuracoes.fiscalPadrao,
        'EXCLUSAO_AVALIACAO_DESEMPENHO',
        'MEDICAO',
        medicaoId,
        `Avaliação de Desempenho nº ${med.numero.toString().padStart(2, '0')} excluída.`
      );
      await persist({
        ...db,
        medicoes,
        auditoria: [audit, ...db.auditoria],
      });
      get().pushToast(
        'info',
        `Avaliação de Desempenho nº ${med.numero.toString().padStart(2, '0')} excluída.`
      );
    },
  };
});
