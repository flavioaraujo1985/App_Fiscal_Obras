import { Check, Download, Edit3, FileDown, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import GeoMap from '../../components/GeoMap';
import LocalImage from '../../components/LocalImage';
import UploadPhoto from '../../components/UploadPhoto';
import { deviceStorage, extractLocalFileId, isLocalFileUrl } from '../../services/deviceStorage';
import { gerarPdfRelatorioFotografico } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { CategoriaFoto, Contrato, DiarioObra, FotoDiario } from '../../types';
import { formatDateBR } from '../../utils/engineering';

const CATEGORIAS_FOTO: CategoriaFoto[] = [
  'FUNDAÇÃO',
  'ESTRUTURA',
  'ALVENARIA',
  'INSTALAÇÕES',
  'PAVIMENTAÇÃO',
  'COBERTURA',
  'ACABAMENTO',
];

export default function FotosSection({
  diario,
  contrato,
}: {
  diario: DiarioObra;
  contrato: Contrato;
}) {
  const { db, updateDiario, pushToast } = useFiscalStore();
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eCategoria, setECategoria] = useState<CategoriaFoto>('ESTRUTURA');
  const [eDesc, setEDesc] = useState('');
  const [fotoToDelete, setFotoToDelete] = useState<FotoDiario | null>(null);

  const handleAdd = async (payload: {
    url: string;
    categoria: CategoriaFoto;
    observacao: string;
    latitude: number;
    longitude: number;
    dataHora: string;
  }) => {
    await updateDiario(diario.id, {
      fotos: [
        ...diario.fotos,
        {
          id: `fd-${Date.now()}`,
          diarioId: diario.id,
          contratoId: contrato.id,
          url: payload.url,
          descricao: payload.observacao,
          categoria: payload.categoria,
          latitude: payload.latitude,
          longitude: payload.longitude,
          dataHora: payload.dataHora,
        },
      ],
    });
    pushToast('success', 'Foto salva no dispositivo e adicionada ao RDO.');
  };

  const handleSaveEdit = async (fotoId: string) => {
    await updateDiario(diario.id, {
      fotos: diario.fotos.map((f) =>
        f.id === fotoId ? { ...f, categoria: eCategoria, descricao: eDesc.trim() } : f
      ),
    });
    setEditingId(null);
    pushToast('success', 'Fotografia atualizada.');
  };

  const handleDelete = async (foto: FotoDiario) => {
    if (isLocalFileUrl(foto.url)) {
      try {
        await deviceStorage.deleteFile(extractLocalFileId(foto.url));
      } catch {
        // ignore
      }
    }
    await updateDiario(diario.id, {
      fotos: diario.fotos.filter((f) => f.id !== foto.id),
    });
    pushToast('info', 'Fotografia removida do RDO.');
  };

  const handleExportPdf = async () => {
    setGerandoPdf(true);
    try {
      const assinaturas = diario.assinaturas.map((a) => ({
        id: a.id,
        nome: a.nome,
        cargo: a.cargo,
        registro: a.registro,
        dataHora: a.dataHora,
      }));
      await gerarPdfRelatorioFotografico({
        titulo: `RELATÓRIO FOTOGRÁFICO DO RDO — ${formatDateBR(diario.data)}`,
        subtitulo: `Contrato ${contrato.numero} · ${contrato.contratada}`,
        config: db.configuracoes,
        resumoInfo: [
          ['Contrato / Município', `${contrato.numero} · ${contrato.municipio}`],
          ['Objeto', contrato.objeto],
          ['Data / Clima', `${formatDateBR(diario.data)} · ${diario.clima.temperatura}°C · ${diario.clima.observacao}`],
          ['Fiscal Responsável', `${contrato.fiscal} (${db.configuracoes.creaFiscal})`],
        ],
        fotos: diario.fotos.map((f) => ({
          id: f.id,
          url: f.url,
          categoria: f.categoria,
          descricao: f.descricao,
          dataHora: f.dataHora,
          latitude: f.latitude,
          longitude: f.longitude,
          origem: `RDO ${formatDateBR(diario.data)}`,
          contratoNumero: contrato.numero,
        })),
        assinaturas,
        fileName: `relatorio-fotografico-rdo-${diario.data}-${contrato.numero}.pdf`,
      });
      pushToast('success', 'Relatório Fotográfico do RDO exportado em PDF e salvo no dispositivo.');
    } finally {
      setGerandoPdf(false);
    }
  };

  const markers = diario.fotos.map((f) => ({
    id: f.id,
    latitude: f.latitude,
    longitude: f.longitude,
    title: f.categoria,
    subtitle: f.descricao,
    imageUrl: isLocalFileUrl(f.url) ? undefined : f.url,
  }));

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Relatório Fotográfico do Dia ({diario.fotos.length} foto(s))
          </h3>
          <p className="text-xs text-slate-500">
            Exporte todas as fotos do RDO em PDF com detalhes técnicos, GPS e campos para assinatura física.
          </p>
        </div>
        <button
          type="button"
          disabled={gerandoPdf || diario.fotos.length === 0}
          onClick={() => void handleExportPdf()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <FileDown className="w-4 h-4" />
          <span>{gerandoPdf ? 'Gerando PDF...' : 'Baixar Relatório Fotográfico (PDF)'}</span>
        </button>
      </div>

      <UploadPhoto
        defaultLat={contrato.latitude}
        defaultLng={contrato.longitude}
        onAddPhoto={handleAdd}
      />

      {markers.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">
            Localização dos Registros Fotográficos
          </h3>
          <GeoMap markers={markers} heightClass="h-64" />
        </div>
      )}

      {diario.fotos.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {diario.fotos.map((f) => {
            const isEditing = editingId === f.id;
            return (
              <div key={f.id} className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <LocalImage
                  src={f.url}
                  alt={f.descricao}
                  className="w-full h-44 object-cover"
                />
                <div className="p-3.5 space-y-2">
                  {isEditing ? (
                    <div className="space-y-2">
                      <select
                        value={eCategoria}
                        onChange={(e) => setECategoria(e.target.value as CategoriaFoto)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded"
                      >
                        {CATEGORIAS_FOTO.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <textarea
                        rows={2}
                        value={eDesc}
                        onChange={(e) => setEDesc(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleSaveEdit(f.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 rounded hover:bg-emerald-800"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-[#004A8F] font-semibold">{f.categoria}</span>
                        <div className="flex items-center gap-2">
                          {isLocalFileUrl(f.url) && (
                            <button
                              type="button"
                              onClick={() =>
                                void deviceStorage.downloadStoredFile(f.url, `rdo_${f.id}.jpg`)
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#004A8F] hover:underline"
                            >
                              <Download className="w-3 h-3" />
                              <span>Baixar</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(f.id);
                              setECategoria(f.categoria);
                              setEDesc(f.descricao);
                            }}
                            className="p-1 text-slate-400 hover:text-[#004A8F] rounded"
                            aria-label="Editar foto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFotoToDelete(f)}
                            className="p-1 text-slate-400 hover:text-red-600 rounded"
                            aria-label="Excluir foto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="text-sm text-slate-800">{f.descricao}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {formatDateBR(f.dataHora)} · {f.latitude.toFixed(5)}, {f.longitude.toFixed(5)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(fotoToDelete)}
        destructive
        title="Excluir Fotografia"
        description="Tem certeza que deseja excluir esta fotografia do RDO? Se estiver salva no dispositivo, ela também será removida."
        confirmLabel="Excluir Foto"
        onCancel={() => setFotoToDelete(null)}
        onConfirm={async () => {
          if (fotoToDelete) {
            await handleDelete(fotoToDelete);
          }
          setFotoToDelete(null);
        }}
      />
    </div>
  );
}
