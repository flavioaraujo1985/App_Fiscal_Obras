import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import dayjs from 'dayjs';
import { Bar } from 'react-chartjs-2';
import StatCard from '../../components/StatCard';
import { useFiscalStore } from '../../store/useFiscalStore';
import { calcularDiasRestantes, calcularScoreContratada } from '../../utils/engineering';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export default function IndicadoresNC() {
  const { db, selectedContratoId } = useFiscalStore();
  const ncs = db.naoConformidades.filter(
    (nc) => selectedContratoId === 'ALL' || nc.contratoId === selectedContratoId
  );

  const abertas = ncs.filter((nc) => nc.status !== 'ENCERRADA');
  const encerradas = ncs.filter((nc) => nc.status === 'ENCERRADA');
  const vencidas = abertas.filter((nc) => calcularDiasRestantes(nc.dataLimite) < 0);
  const criticas = abertas.filter((nc) => nc.gravidade === 'CRITICA');
  const reincidentes = ncs.filter((nc) => nc.reincidente).length;
  const indiceReincidencia = ncs.length > 0 ? Math.round((reincidentes / ncs.length) * 100) : 0;

  const tempos = encerradas
    .filter((nc) => nc.dataEncerramento)
    .map((nc) => Math.max(1, dayjs(nc.dataEncerramento).diff(dayjs(nc.dataRegistro), 'day')));
  const tempoMedio =
    tempos.length > 0
      ? Math.round(tempos.reduce((a, b) => a + b, 0) / tempos.length)
      : 6;

  const score = calcularScoreContratada(ncs);

  const chartData = {
    labels: ['Baixa', 'Média', 'Alta', 'Crítica'],
    datasets: [
      {
        label: 'Abertas / Em Tratamento',
        data: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].map(
          (g) => abertas.filter((n) => n.gravidade === g).length
        ),
        backgroundColor: '#004A8F',
      },
      {
        label: 'Encerradas',
        data: ['BAIXA', 'MEDIA', 'ALTA', 'CRITICA'].map(
          (g) => encerradas.filter((n) => n.gravidade === g).length
        ),
        backgroundColor: '#00897B',
      },
    ],
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="NCs Abertas"
          value={String(abertas.length)}
          tone={abertas.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="NCs Vencidas"
          value={String(vencidas.length)}
          tone={vencidas.length > 0 ? 'danger' : 'success'}
        />
        <StatCard
          title="NCs Críticas"
          value={String(criticas.length)}
          tone={criticas.length > 0 ? 'danger' : 'success'}
        />
        <StatCard title="Tempo Médio Resol." value={`${tempoMedio} dias`} />
        <StatCard title="Reincidência" value={`${indiceReincidencia}%`} />
        <StatCard
          title="Score Contratada"
          value={`${score}/100`}
          tone={score >= 85 ? 'success' : score >= 65 ? 'warning' : 'danger'}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-3">
          Distribuição de Não Conformidades por Gravidade
        </h2>
        <div className="h-52">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
