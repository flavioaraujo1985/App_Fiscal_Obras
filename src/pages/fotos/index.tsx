import { Check, Download, Edit3, FileDown, MapPin, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import GeoMap from '../../components/GeoMap';
import LocalImage from '../../components/LocalImage';
import UploadPhoto from '../../components/UploadPhoto';
import { deviceStorage, extractLocalFileId, isLocalFileUrl } from '../../services/deviceStorage';
import { gerarPdfRelatorioFotografico } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { CategoriaFoto } from '../../types';
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

interface FotoUnificada {
  id: string;
  sourceType: 'MEDICAO' | 'DIARIO';
  sourceId: string;
  origem: string;
  contratoId: string;
  contratoNumero: string;
  categoria: CategoriaFoto;
  descricao: string;
  url: string;
  latitude: number;
  longitude: number;
  dataHora: string;
}

export default function Fotos() {
  const { db, selectedContratoId, updateDiario, updateMedicao, addDiario, pushToast } =
    useFiscalStore();
  const [categoriaFiltro, setCategoriaFiltro] = useState<'ALL' | string>('ALL');
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [eCategoria, setECategoria] = useState<CategoriaFoto>('ESTRUTURA');
  const [eDesc, setEDesc] = useState('');
  const [fotoToDelete, setFotoToDelete] = useState<FotoUnificada | null>(null);

  const fotos: FotoUnificada[] = [];
  const getContratoNumero = (id: string) =>
    db.contratos.find((c) => c.id === id)?.numero ?? id;

  for (const m of db.medicoes) {
    if (selectedContratoId !== 'ALL' && m.contratoId !== selectedContratoId) continue;
    for (const f of m.fotos) {
      fotos.push({
        id: f.id,
        sourceType: 'MEDICAO',
        sourceId: m.id,
        origem: `Medição nº ${m.numero}`,
        contratoId: f.contratoId,
        contratoNumero: getContratoNumero(f.contratoId),
        categoria: f.categoria,
        descricao: f.observacao,
        url: f.url,
        latitude: f.latitude,
        longitude: f.longitude,
        dataHora: f.dataHora,
      });
    }
  }

  for (const d of db.diarios) {
    if (selectedContratoId !== 'ALL' && d.contratoId !== selectedContratoId) continue;
    for (const f of d.fotos) {
      fotos.push({
        id: f.id,
        sourceType: 'DIARIO',
        sourceId: d.id,
        origem: `RDO ${formatDateBR(d.data)}`,
        contratoId: f.contratoId,
        contratoNumero: getContratoNumero(f.contratoId),
        categoria: f.categoria,
        descricao: f.descricao,
        url: f.url,
        latitude: f.latitude,
        longitude: f.longitude,
        dataHora: f.dataHora,
      });
    }
  }

  const categoriasUnicas = Array.from(new Set(fotos.map((f) => f.categoria)));
  const fotosFiltradas = fotos.filter(
    (f) => categoriaFiltro === 'ALL' || f.categoria === categoriaFiltro
  );

  const handleUploadGlobal = async (payload: {
    url: string;
    categoria: CategoriaFoto;
    observacao: string;
    latitude: number;
    longitude: number;
    dataHora: string;
  }) => {
    const alvoContratoId =
      selectedContratoId !== 'ALL' ? selectedContratoId : db.contratos[0]?.id;
    if (!alvoContratoId) return;

    const rdoExistente = db.diarios.find((d) => d.contratoId === alvoContratoId);
    if (rdoExistente) {
      await updateDiario(rdoExistente.id, {
        fotos: [
          ...rdoExistente.fotos,
          {
            id: `fd-${Date.now()}`,
            diarioId: rdoExistente.id,
            contratoId: alvoContratoId,
            url: payload.url,
            descricao: payload.observacao,
            categoria: payload.categoria,
            latitude: payload.latitude,
            longitude: payload.longitude,
            dataHora: payload.dataHora,
          },
        ],
      });
    } else {
      await addDiario({
        contratoId: alvoContratoId,
        data: new Date().toISOString().slice(0, 10),
        clima: {
          temperatura: 30,
          umidade: 55,
          chuva: false,
          velocidadeVento: 12,
          observacao: 'Registro de campo',
        },
        observacoes: 'RDO aberto via registro fotográfico georreferenciado.',
        paralisado: false,
        status: 'RASCUNHO',
        efetivo: [],
        equipamentos: [],
        atividades: [],
        ocorrencias: [],
        fotos: [
          {
            id: `fd-${Date.now()}`,
            diarioId: '',
            contratoId: alvoContratoId,
            url: payload.url,
            descricao: payload.observacao,
            categoria: payload.categoria,
            latitude: payload.latitude,
            longitude: payload.longitude,
            dataHora: payload.dataHora,
          },
        ],
        assinaturas: [],
      });
    }
    pushToast('success', 'Fotografia salva localmente no dispositivo e vinculada ao acervo.');
  };

  const handleSaveEdit = async (foto: FotoUnificada) => {
    if (foto.sourceType === 'MEDICAO') {
      const med = db.medicoes.find((m) => m.id === foto.sourceId);
      if (!med) return;
      await updateMedicao(med.id, {
        fotos: med.fotos.map((item) =>
          item.id === foto.id
            ? { ...item, categoria: eCategoria, observacao: eDesc.trim() }
            : item
        ),
      });
    } else {
      const rdo = db.diarios.find((d) => d.id === foto.sourceId);
      if (!rdo) return;
      await updateDiario(rdo.id, {
        fotos: rdo.fotos.map((item) =>
          item.id === foto.id
            ? { ...item, categoria: eCategoria, descricao: eDesc.trim() }
            : item
        ),
      });
    }
    setEditingKey(null);
    pushToast('success', 'Fotografia atualizada.');
  };

  const handleDelete = async (foto: FotoUnificada) => {
    if (isLocalFileUrl(foto.url)) {
      try {
        await deviceStorage.deleteFile(extractLocalFileId(foto.url));
      } catch {
        // ignore
      }
    }
    if (foto.sourceType === 'MEDICAO') {
      const med = db.medicoes.find((m) => m.id === foto.sourceId);
      if (med) {
        await updateMedicao(med.id, {
          fotos: med.fotos.filter((item) => item.id !== foto.id),
        });
      }
    } else {
      const rdo = db.diarios.find((d) => d.id === foto.sourceId);
      if (rdo) {
        await updateDiario(rdo.id, {
          fotos: rdo.fotos.filter((item) => item.id !== foto.id),
        });
      }
    }
    pushToast('info', 'Fotografia excluída do acervo.');
  };

  const markers = fotosFiltradas.map((f) => ({
    id: f.id,
    latitude: f.latitude,
    longitude: f.longitude,
    title: `${f.contratoNumero} · ${f.categoria}`,
    subtitle: `${f.origem} — ${f.descricao}`,
    imageUrl: isLocalFileUrl(f.url) ? undefined : f.url,
  }));

  const handleExportarPdf = async () => {
    setGerandoPdf(true);
    try {
      const ctr =
        selectedContratoId !== 'ALL'
          ? db.contratos.find((c) => c.id === selectedContratoId)
          : undefined;
      await gerarPdfRelatorioFotografico({
        titulo: 'RELATÓRIO FOTOGRÁFICO DE FISCALIZAÇÃO DE OBRAS',
        subtitulo: ctr
          ? `Contrato ${ctr.numero} · ${ctr.contratada} · Filtro: ${categoriaFiltro === 'ALL' ? 'Todas as categorias' : categoriaFiltro}`
          : `Consolidado de Contratos · Filtro: ${categoriaFiltro === 'ALL' ? 'Todas as categorias' : categoriaFiltro}`,
        config: db.configuracoes,
        resumoInfo: [
          ['Escopo', ctr ? `Contrato ${ctr.numero} — ${ctr.objeto}` : `${db.contratos.length} contrato(s) fiscalizado(s)`],
          ['Categoria Filtrada', categoriaFiltro === 'ALL' ? 'Todas as etapas' : categoriaFiltro],
          ['Fiscal Responsável', `${db.configuracoes.fiscalPadrao} (${db.configuracoes.creaFiscal})`],
        ],
        fotos: fotosFiltradas.map((f) => ({
          id: f.id,
          url: f.url,
          categoria: f.categoria,
          descricao: f.descricao,
          dataHora: f.dataHora,
          latitude: f.latitude,
          longitude: f.longitude,
          origem: f.origem,
          contratoNumero: f.contratoNumero,
        })),
        assinaturas: db.assinaturasRelatorios ?? [],
        fileName: `relatorio-fotografico-${new Date().toISOString().slice(0, 10)}.pdf`,
      });
      pushToast('success', 'Relatório Fotográfico exportado em PDF com imagens e salvo no dispositivo.');
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Acervo Fotográfico Georreferenciado
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Mapeamento espacial e histórico visual de inspeções salvo diretamente no dispositivo.
          </p>
        </div>

        <button
          type="button"
          disabled={gerandoPdf || fotosFiltradas.length === 0}
          onClick={() => void handleExportarPdf()}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <FileDown className="w-4 h-4" />
          <span>{gerandoPdf ? 'Gerando PDF...' : `Baixar Relatório Fotográfico (${fotosFiltradas.length})`}</span>
        </button>
      </div>

      <UploadPhoto onAddPhoto={handleUploadGlobal} />

      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">
            Mapa de Registros ({markers.length})
          </h2>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCategoriaFiltro('ALL')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                categoriaFiltro === 'ALL'
                  ? 'bg-[#004A8F] text-white border-[#004A8F]'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Todas
            </button>
            {categoriasUnicas.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaFiltro(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md border ${
                  categoriaFiltro === cat
                    ? 'bg-[#004A8F] text-white border-[#004A8F]'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <GeoMap markers={markers} heightClass="h-80" />
      </div>

      {fotosFiltradas.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-500">
          Nenhuma foto encontrada para o filtro selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {fotosFiltradas.map((f) => {
            const itemKey = `${f.sourceType}:${f.sourceId}:${f.id}`;
            const isEditing = editingKey === itemKey;
            return (
              <div
                key={itemKey}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col"
              >
                <LocalImage
                  src={f.url}
                  alt={f.descricao}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4 space-y-2 flex-1 flex flex-col justify-between">
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
                        rows={3}
                        value={eDesc}
                        onChange={(e) => setEDesc(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleSaveEdit(f)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-white bg-emerald-700 rounded hover:bg-emerald-800"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingKey(null)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded hover:bg-slate-200"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Cancelar</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-[#004A8F]">{f.categoria}</span>
                          <span className="font-mono">Contrato {f.contratoNumero}</span>
                        </div>
                        <p className="text-sm text-slate-800 mt-1 leading-relaxed">{f.descricao}</p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {f.latitude.toFixed(5)}, {f.longitude.toFixed(5)}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isLocalFileUrl(f.url) ? (
                            <button
                              type="button"
                              onClick={() =>
                                void deviceStorage.downloadStoredFile(f.url, `foto_${f.id}.jpg`)
                              }
                              className="inline-flex items-center gap-1 text-[#004A8F] hover:underline"
                            >
                              <Download className="w-3 h-3" />
                              <span>Baixar</span>
                            </button>
                          ) : (
                            <span>{f.origem}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingKey(itemKey);
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
        description={
          fotoToDelete
            ? `Tem certeza que deseja excluir esta fotografia (${fotoToDelete.origem})? Se estiver salva no dispositivo, ela também será removida.`
            : ''
        }
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
