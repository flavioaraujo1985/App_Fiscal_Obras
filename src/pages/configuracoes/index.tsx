import {
  Download,
  HardDrive,
  RotateCcw,
  Save,
  ShieldCheck,
  Trash2,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import PWAInstallButton from '../../components/PWAInstallButton';
import {
  deviceStorage,
  formatBytesBR,
  LOCAL_FILE_PREFIX,
  type DeviceStorageStats,
  type StoredDeviceFileMeta,
} from '../../services/deviceStorage';
import { useFiscalStore } from '../../store/useFiscalStore';
import { formatDateBR } from '../../utils/engineering';

export default function ConfiguracoesPage() {
  const {
    db,
    updateConfiguracoes,
    resetDatabase,
    exportBackup,
    importBackup,
    pushToast,
  } = useFiscalStore();
  const [form, setForm] = useState(db.configuracoes);
  const [confirmReset, setConfirmReset] = useState(false);

  const [stats, setStats] = useState<DeviceStorageStats | null>(null);
  const [files, setFiles] = useState<StoredDeviceFileMeta[]>([]);

  const loadStorageInfo = useCallback(async () => {
    const [s, list] = await Promise.all([
      deviceStorage.getStorageStats(),
      deviceStorage.listFiles(),
    ]);
    setStats(s);
    setFiles(list);
  }, []);

  useEffect(() => {
    void loadStorageInfo();
  }, [loadStorageInfo, db]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateConfiguracoes(form);
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      await importBackup(file);
      await loadStorageInfo();
    } catch (err) {
      pushToast('error', err instanceof Error ? err.message : 'Erro ao importar backup.');
    }
    e.target.value = '';
  };

  const handleDeleteLocalFile = async (id: string) => {
    await deviceStorage.deleteFile(id);
    await loadStorageInfo();
    pushToast('info', 'Arquivo removido do armazenamento local.');
  };

  const handleRequestPersistence = async () => {
    const granted = await deviceStorage.requestPersistence();
    await loadStorageInfo();
    pushToast(
      granted ? 'success' : 'info',
      granted
        ? 'Armazenamento persistente ativado pelo dispositivo.'
        : 'O navegador gerencia automaticamente a persistência deste aplicativo.'
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Configurações & Armazenamento Local
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Parâmetros institucionais, instalação no celular e gerenciamento de arquivos offline.
          </p>
        </div>
        <PWAInstallButton />
      </div>

      {/* On-Device Storage Panel */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <HardDrive className="w-5 h-5 text-[#004A8F]" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Armazenamento Local no Dispositivo (Celular)
              </h2>
              <p className="text-xs text-slate-500">
                Fotos, documentos, evidências e registros são gravados localmente em IndexedDB e OPFS
                no próprio aparelho.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestPersistence}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-50 border border-slate-300 rounded-md hover:bg-slate-100"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>{stats?.persisted ? 'Persistência Ativa' : 'Fixar Armazenamento'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-xs text-slate-500">Uso no Dispositivo</div>
            <div className="font-mono font-semibold text-slate-900 mt-0.5">
              {stats ? formatBytesBR(stats.usedBytes) : '—'}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-xs text-slate-500">Espaço Disponível</div>
            <div className="font-mono font-semibold text-slate-900 mt-0.5">
              {stats && stats.quotaBytes > 0 ? formatBytesBR(stats.quotaBytes) : 'Dinâmico'}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-xs text-slate-500">Arquivos Locais</div>
            <div className="font-mono font-semibold text-[#004A8F] mt-0.5">
              {stats?.fileCount ?? 0} ({stats ? formatBytesBR(stats.totalFilesBytes) : '0 B'})
            </div>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-md">
            <div className="text-xs text-slate-500">Sistema de Arquivos (OPFS)</div>
            <div className="font-mono font-semibold text-emerald-700 mt-0.5">
              {stats?.opfsSupported ? 'Ativo' : 'IndexedDB'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={() => void exportBackup()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Salvar Backup Completo no Celular (.json)</span>
          </button>

          <label className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer">
            <Upload className="w-3.5 h-3.5" />
            <span>Restaurar Backup do Celular</span>
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleImportBackup}
              className="hidden"
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="border border-slate-200 rounded-md divide-y divide-slate-100">
            <div className="px-4 py-2.5 bg-slate-50 text-xs font-semibold text-slate-600">
              Arquivos Armazenados no Aparelho ({files.length})
            </div>
            {files.map((f) => (
              <div key={f.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-medium text-slate-900 truncate">{f.name}</div>
                  <div className="text-slate-500 font-mono">
                    {f.mimeType} · {formatBytesBR(f.size)} · {formatDateBR(f.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      void deviceStorage.downloadStoredFile(`${LOCAL_FILE_PREFIX}${f.id}`, f.name)
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded hover:bg-blue-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Baixar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDeleteLocalFile(f.id)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded"
                    aria-label="Excluir arquivo local"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Institutional Settings Form */}
      <form onSubmit={handleSave} className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <h2 className="text-base font-semibold text-slate-900">Identificação Institucional</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">Órgão / Entidade</label>
            <input
              value={form.orgaoNome}
              onChange={(e) => setForm({ ...form, orgaoNome: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Diretoria / Setor</label>
            <input
              value={form.secretaria}
              onChange={(e) => setForm({ ...form, secretaria: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Cidade / UF</label>
            <input
              value={form.cidadeUf}
              onChange={(e) => setForm({ ...form, cidadeUf: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Fiscal Padrão</label>
            <input
              value={form.fiscalPadrao}
              onChange={(e) => setForm({ ...form, fiscalPadrao: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Registro CREA / CAU</label>
            <input
              value={form.creaFiscal}
              onChange={(e) => setForm({ ...form, creaFiscal: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Gestor Padrão</label>
            <input
              value={form.gestorPadrao}
              onChange={(e) => setForm({ ...form, gestorPadrao: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Antecedência de Alerta de Vigência (dias)
            </label>
            <input
              type="number"
              value={form.alertaVigenciaDias}
              onChange={(e) =>
                setForm({ ...form, alertaVigenciaDias: Number(e.target.value) || 30 })
              }
              className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Prazos Padrão de Correção de Não Conformidades (Dias)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'] as const).map((grav) => (
              <div key={grav}>
                <label className="block text-xs text-slate-500 mb-1">{grav}</label>
                <input
                  type="number"
                  min={1}
                  value={form.prazosNC[grav]}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      prazosNC: {
                        ...form.prazosNC,
                        [grav]: Number(e.target.value) || 1,
                      },
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-md hover:bg-red-100"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Base Inicial</span>
          </button>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970]"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações</span>
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmReset}
        destructive
        title="Restaurar base de dados inicial?"
        description="Todos os contratos, medições, RDOs, não conformidades e arquivos salvos localmente no dispositivo serão substituídos pelos registros iniciais de demonstração."
        confirmLabel="Restaurar Base"
        onCancel={() => setConfirmReset(false)}
        onConfirm={async () => {
          setConfirmReset(false);
          await resetDatabase();
          await loadStorageInfo();
        }}
      />
    </div>
  );
}
