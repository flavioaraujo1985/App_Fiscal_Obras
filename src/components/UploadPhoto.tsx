import { Camera, Crosshair, Upload } from 'lucide-react';
import { useEffect, useState } from 'react';
import { deviceStorage } from '../services/deviceStorage';
import type { CategoriaFoto } from '../types';

const CATEGORIAS: CategoriaFoto[] = [
  'FUNDAÇÃO',
  'ESTRUTURA',
  'ALVENARIA',
  'INSTALAÇÕES',
  'PAVIMENTAÇÃO',
  'COBERTURA',
  'ACABAMENTO',
];

interface UploadPhotoProps {
  defaultLat?: number;
  defaultLng?: number;
  onAddPhoto: (payload: {
    url: string;
    categoria: CategoriaFoto;
    observacao: string;
    latitude: number;
    longitude: number;
    dataHora: string;
  }) => void;
}

export default function UploadPhoto({
  defaultLat = -7.2306,
  defaultLng = -35.8811,
  onAddPhoto,
}: UploadPhotoProps) {
  const [categoria, setCategoria] = useState<CategoriaFoto>('ESTRUTURA');
  const [observacao, setObservacao] = useState('');
  const [latitude, setLatitude] = useState<number>(defaultLat);
  const [longitude, setLongitude] = useState<number>(defaultLng);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<string>('Coordenadas da obra');

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const capturarGps = () => {
    if (!navigator.geolocation) {
      setGpsStatus('Geolocalização indisponível no navegador');
      return;
    }
    setGpsStatus('Obtendo GPS...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(Number(position.coords.latitude.toFixed(6)));
        setLongitude(Number(position.coords.longitude.toFixed(6)));
        setGpsStatus('GPS capturado com sucesso');
      },
      () => {
        setGpsStatus('Permissão negada; usando coordenadas da obra');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setSaving(true);
    try {
      const stored = await deviceStorage.saveFileToDevice(selectedFile);
      onAddPhoto({
        url: stored.url,
        categoria,
        observacao: observacao.trim() || `Registro fotográfico de ${categoria.toLowerCase()}`,
        latitude,
        longitude,
        dataHora: new Date().toISOString(),
      });
      setSelectedFile(null);
      setPreviewUrl('');
      setObservacao('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Registrar Foto Georreferenciada
          </h3>
          <p className="text-xs text-slate-500">
            O arquivo é salvo diretamente no armazenamento local do dispositivo.
          </p>
        </div>
        <button
          type="button"
          onClick={capturarGps}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
        >
          <Crosshair className="w-3.5 h-3.5" />
          <span>Capturar GPS</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Etapa / Categoria
          </label>
          <select
            value={categoria}
            onChange={(e) => setCategoria(e.target.value as CategoriaFoto)}
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
          >
            {CATEGORIAS.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Latitude
          </label>
          <input
            type="number"
            step="0.000001"
            value={latitude}
            onChange={(e) => setLatitude(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Longitude
          </label>
          <input
            type="number"
            step="0.000001"
            value={longitude}
            onChange={(e) => setLongitude(Number(e.target.value))}
            className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Câmera / Arquivo
          </label>
          <label className="flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-slate-700 bg-slate-50 border border-slate-300 border-dashed rounded-md cursor-pointer hover:bg-slate-100 transition-colors">
            <Camera className="w-4 h-4 text-slate-500" />
            <span className="truncate">{selectedFile ? selectedFile.name : 'Fotografar / Escolher'}</span>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-slate-600 mb-1">
            Observação Técnica ({gpsStatus})
          </label>
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Descreva o serviço executado, local e condições observadas..."
            className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-md focus:outline-none focus:border-[#004A8F]"
          />
        </div>
        <button
          type="submit"
          disabled={!selectedFile || saving}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] disabled:opacity-40 disabled:cursor-not-allowed transition-colors whitespace-nowrap shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>{saving ? 'Salvando...' : 'Salvar no Dispositivo'}</span>
        </button>
      </div>

      {previewUrl && (
        <div className="pt-2">
          <img
            src={previewUrl}
            alt="Pré-visualização da foto de fiscalização"
            referrerPolicy="no-referrer"
            className="h-36 w-56 object-cover rounded-md border border-slate-200"
          />
        </div>
      )}
    </form>
  );
}
