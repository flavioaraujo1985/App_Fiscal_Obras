import { CloudRain, RefreshCw, Sun } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../services/api';
import { useFiscalStore } from '../../store/useFiscalStore';
import type { Contrato, DiarioObra } from '../../types';

export default function ClimaSection({
  diario,
  contrato,
}: {
  diario: DiarioObra;
  contrato: Contrato;
}) {
  const { updateDiario, pushToast } = useFiscalStore();
  const [fetching, setFetching] = useState(false);

  const atualizarClimaApi = async () => {
    setFetching(true);
    try {
      const clima = await api.getClima(contrato.latitude, contrato.longitude);
      await updateDiario(diario.id, { clima });
      pushToast('success', 'Dados meteorológicos atualizados via /api/clima.');
    } catch {
      pushToast('error', 'Não foi possível consultar o serviço meteorológico.');
    } finally {
      setFetching(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {diario.clima.chuva ? (
            <CloudRain className="w-5 h-5 text-[#004A8F]" />
          ) : (
            <Sun className="w-5 h-5 text-amber-500" />
          )}
          <h3 className="text-base font-semibold text-slate-900">Condições Climáticas</h3>
        </div>
        <button
          type="button"
          onClick={atualizarClimaApi}
          disabled={fetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#004A8F] bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${fetching ? 'animate-spin' : ''}`} />
          <span>Consultar Clima GPS</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Temperatura (°C)</label>
          <input
            type="number"
            value={diario.clima.temperatura}
            onChange={(e) =>
              updateDiario(diario.id, {
                clima: { ...diario.clima, temperatura: Number(e.target.value) },
              })
            }
            className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Umidade (%)</label>
          <input
            type="number"
            value={diario.clima.umidade}
            onChange={(e) =>
              updateDiario(diario.id, {
                clima: { ...diario.clima, umidade: Number(e.target.value) },
              })
            }
            className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Vento (km/h)</label>
          <input
            type="number"
            value={diario.clima.velocidadeVento}
            onChange={(e) =>
              updateDiario(diario.id, {
                clima: { ...diario.clima, velocidadeVento: Number(e.target.value) },
              })
            }
            className="w-full px-3 py-2 text-sm font-mono tabular-nums border border-slate-300 rounded-md"
          />
        </div>
        <div className="flex items-end pb-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={diario.clima.chuva}
              onChange={(e) =>
                updateDiario(diario.id, {
                  clima: { ...diario.clima, chuva: e.target.checked },
                })
              }
              className="accent-[#004A8F]"
            />
            <span>Ocorrência de Chuva</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-xs text-slate-500 mb-1">Observação Climática</label>
        <input
          value={diario.clima.observacao}
          onChange={(e) =>
            updateDiario(diario.id, {
              clima: { ...diario.clima, observacao: e.target.value },
            })
          }
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
        />
      </div>
    </div>
  );
}
