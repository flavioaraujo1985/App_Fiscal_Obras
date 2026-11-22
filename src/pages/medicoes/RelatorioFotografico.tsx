import { Camera, Check, Download, Edit3, FileDown, MapPin, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import LocalImage from '../../components/LocalImage';
import UploadPhoto from '../../components/UploadPhoto';
import { deviceStorage, extractLocalFileId, isLocalFileUrl } from '../../services/deviceStorage';
import { gerarPdfRelatorioFotografico } from '../../services/pdfGenerator';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { CategoriaFoto, Contrato, FotoMedicao, Medicao } from '../../types';
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

export default function RelatorioFotografico({
  medicao,
  contrato,
}: {
  medicao: Medicao;
  contrato: Contrato;
}) {
  const { db, updateMedicao, pushToast } = useFiscalStore();
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eCategoria, setECategoria] = useState<CategoriaFoto>('ESTRUTURA');
  const [eObs, setEObs] = useState('');
  const [fotoToDelete, setFotoToDelete] = useState<FotoMedicao | null>(null);

  const handleAddPhoto = async (payload: {
    url: string;
    categoria: Medicao['fotos'][number]['categoria'];
    observacao: string;
    latitude: number;
    longitude: number;
    dataHora: string;
  }) => {
    const novaFoto = {
      id: `fm-${Date.now()}`,
      medicaoId: medicao.id,
      contratoId: contrato.id,
      ...payload,
    };
    await updateMedicao(medicao.id, {
      fotos: [...medicao.fotos, novaFoto],
    });
    pushToast('success', 'Foto georreferenciada salva no dispositivo e anexada ao boletim.');
  };

  const startEdit = (foto: FotoMedicao) => {
    setEditingId(foto.id);
    setECategoria(foto.categoria);
    setEObs(foto.observacao);
  };

  const saveEdit = async (fotoId: string) => {
    await updateMedicao(medicao.id, {
      fotos: medicao.fotos.map((f) =>
        f.id === fotoId ? { ...f, categoria: eCategoria, observacao: eObs.trim() } : f
      ),
    });
    setEditingId(null);
    pushToast('success', 'Registro fotográfico atualizado.');
  };

  const handleDeletePhoto = async (foto: FotoMedicao) => {
    if (isLocalFileUrl(foto.url)) {
      try {
        await deviceStorage.deleteFile(extractLocalFileId(foto.url));
      } catch {
        // ignore
      }
    }
    await updateMedicao(medicao.id, {
      fotos: medicao.fotos.filter((f) => f.id !== foto.id),
    });
    pushToast('info', 'Foto removida da medição.');
  };

  const handleGerarPdfFotografico = async () => {
    setGerandoPdf(true);
    try {
      const numStr = medicao.numero.toString().padStart(2, '0');
      await gerarPdfRelatorioFotografico({
        titulo: `RELATÓRIO FOTOGRÁFICO — MEDIÇÃO Nº ${numStr}`,
        subtitulo: `Contrato ${contrato.numero} · ${contrato.contratada} · Competência ${medicao.competencia}`,
        config: db.configuracoes,
        resumoInfo: [
          ['Contrato / Processo', `${contrato.numero} · Processo ${contrato.processo}`],
          ['Objeto', contrato.objeto],
          ['Empresa Contratada', `${contrato.contratada} (CNPJ ${contrato.cnpj})`],
          ['Período da Medição', `${formatDateBR(medicao.dataInicio)} a ${formatDateBR(medicao.dataFim)}`],
          ['Fiscal / Gestor', `${contrato.fiscal} (${db.configuracoes.creaFiscal}) · ${contrato.gestor}`],
        ],
        fotos: medicao.fotos.map((f) => ({
          id: f.id,
          url: f.url,
          categoria: f.categoria,
          descricao: f.observacao,
          dataHora: f.dataHora,
          latitude: f.latitude,
          longitude: f.longitude,
          origem: `Boletim de Medição nº ${numStr}`,
          contratoNumero: contrato.numero,
        })),
        assinaturas: medicao.assinaturas ?? [],
        fallbackSigners: [
          {
            nome: contrato.fiscal,
            cargo: 'Fiscal do Contrato',
            registro: db.configuracoes.creaFiscal,
          },
          { nome: contrato.gestor, cargo: 'Gestor do Contrato' },
          { nome: contrato.contratada, cargo: 'Contratada', registro: contrato.cnpj },
        ],
        fileName: `relatorio-fotografico-medicao-${numStr}-${contrato.numero}.pdf`,
      });
      pushToast('success', 'Relatório Fotográfico exportado em PDF com imagens e salvo no dispositivo.');
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Relatório Fotográfico da Medição ({medicao.fotos.length} foto(s))
          </h3>
          <p className="text-xs text-slate-500">
            Gera PDF com todas as imagens anexadas, coordenadas GPS, datas, observações e campos para assinatura física.
          </p>
        </div>
        <button
          type="button"
          disabled={gerandoPdf || medicao.fotos.length === 0}
          onClick={() => void handleGerarPdfFotografico()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-50 whitespace-nowrap shrink-0"
        >
          <FileDown className="w-4 h-4" />
          <span>{gerandoPdf ? 'Gerando PDF...' : 'Baixar Relatório Fotográfico (PDF)'}</span>
        </button>
      </div>

      <UploadPhoto
        defaultLat={contrato.latitude}
        defaultLng={contrato.longitude}
        onAddPhoto={handleAddPhoto}
      />

      {medicao.fotos.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-sm text-slate-500">
          Nenhuma fotografia registrada neste boletim de medição.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {medicao.fotos.map((foto) => {
            const isEditing = editingId === foto.id;
            return (
              <div
                key={foto.id}
                className="bg-white border border-slate-200 rounded-lg overflow-hidden flex flex-col"
              >
                <div className="relative h-48 bg-slate-100">
                  <LocalImage
                    src={foto.url}
                    alt={foto.observacao}
                    className="w-full h-full object-cover"
                  />
                </div>
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
                        value={eObs}
                        onChange={(e) => setEObs(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-300 rounded"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => void saveEdit(foto.id)}
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
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-[#004A8F]">{foto.categoria}</span>
                          <span className="font-mono">{formatDateBR(foto.dataHora)}</span>
                        </div>
                        <p className="text-sm text-slate-800 mt-1 leading-relaxed">
                          {foto.observacao}
                        </p>
                      </div>
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-mono text-slate-500 gap-2">
                        <span className="inline-flex items-center gap-1 truncate">
                          <MapPin className="w-3 h-3 shrink-0" />
                          {foto.latitude.toFixed(5)}, {foto.longitude.toFixed(5)}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isLocalFileUrl(foto.url) ? (
                            <button
                              type="button"
                              onClick={() =>
                                void deviceStorage.downloadStoredFile(
                                  foto.url,
                                  `medicao_${foto.id}.jpg`
                                )
                              }
                              className="inline-flex items-center gap-1 text-[#004A8F] hover:underline"
                            >
                              <Download className="w-3 h-3" />
                              <span>Baixar</span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => startEdit(foto)}
                            className="p-1 text-slate-400 hover:text-[#004A8F] rounded"
                            aria-label="Editar foto"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setFotoToDelete(foto)}
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
        description="Tem certeza que deseja excluir esta fotografia da medição? Se estiver salva no dispositivo, ela também será removida."
        confirmLabel="Excluir Foto"
        onCancel={() => setFotoToDelete(null)}
        onConfirm={async () => {
          if (fotoToDelete) {
            await handleDeletePhoto(fotoToDelete);
          }
          setFotoToDelete(null);
        }}
      />
    </div>
  );
}
