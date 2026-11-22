import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { AlertCircle, AlertTriangle, ArrowRight, Info } from 'lucide-react';
import { Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import GeoMap from '../../components/GeoMap';
import StatCard from '../../components/StatCard';
import StatusTag from '../../components/StatusTag';
import { contratoService } from '../../services/contrato.service';
import { useFiscalStore } from '../../store/useFiscalStore';
import {
  calcularDiasRestantes,
  calcularScoreContratada,
  formatCurrencyBR,
  formatDateBR,
  gerarAlertasSistema,
  percentualExecutado,
  vigenciaColor,
} from '../../utils/engineering';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { db, loading, selectedContratoId } = useFiscalStore();

  const contratos =
    selectedContratoId === 'ALL'
      ? db.contratos
      : db.contratos.filter((c) => c.id === selectedContratoId);

  const contratoIds = new Set(contratos.map((c) => c.id));
  const medicoes = db.medicoes.filter((m) => contratoIds.has(m.contratoId));
  const aditivos = db.aditivos.filter((a) => contratoIds.has(a.contratoId));
  const garantias = db.garantias.filter((g) => contratoIds.has(g.contratoId));
  const ncs = db.naoConformidades.filter((nc) => contratoIds.has(nc.contratoId));
  const etapas = db.etapasCronograma.filter((e) => contratoIds.has(e.contratoId));

  const contratosAtivos = contratos.filter((c) => c.status === 'ATIVO').length;
  const valorInicialTotal = contratos.reduce((acc, c) => acc + c.valorInicial, 0);
  const valorAditivosTotal = aditivos
    .filter((a) => a.tipo === 'VALOR')
    .reduce((acc, a) => acc + a.valor, 0);
  const valorAtualTotal = valorInicialTotal + valorAditivosTotal;

  const executadoTotal = medicoes
    .filter((m) => m.status !== 'REJEITADA' && m.status !== 'RASCUNHO')
    .reduce((acc, m) => acc + m.valor, 0);
  const saldoTotal = Math.max(0, valorAtualTotal - executadoTotal);

  const execucaoFisicaMedia =
    etapas.length > 0
      ? contratoService.calcularProgressoFisico(etapas)
      : percentualExecutado(valorAtualTotal, executadoTotal);

  const ncsAbertas = ncs.filter((nc) => nc.status !== 'ENCERRADA');
  const ncsCriticas = ncsAbertas.filter((nc) => nc.gravidade === 'CRITICA').length;
  const scoreContratadas = calcularScoreContratada(ncs);

  const alertas = gerarAlertasSistema({
    contratos,
    garantias,
    ncs,
    medicoes,
    alertaVigenciaDias: db.configuracoes.alertaVigenciaDias,
  });

  const sCurveData = {
    labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'],
    datasets: [
      {
        label: 'Previsto Acumulado (%)',
        data: [8, 16, 25, 35, 45, 55, 64, 73, 81, 88, 94],
        borderColor: '#64748B',
        backgroundColor: 'rgba(100, 116, 139, 0.08)',
        borderDash: [5, 4],
        tension: 0.3,
        pointRadius: 3,
      },
      {
        label: 'Executado Acumulado (%)',
        data: [7, 15, 22, 31, 41, 50, 58, 66, 72, 77, Math.round(execucaoFisicaMedia)],
        borderColor: '#004A8F',
        backgroundColor: 'rgba(0, 74, 143, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 4,
      },
    ],
  };

  const sCurveOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        align: 'end' as const,
        labels: {
          boxWidth: 12,
          font: { size: 12 },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (val: string | number) => `${val}%`,
        },
        grid: {
          color: '#F1F5F9',
        },
      },
      x: {
        grid: { display: false },
      },
    },
  };

  const mapMarkers = [
    ...contratos.map((c) => ({
      id: c.id,
      latitude: c.latitude,
      longitude: c.longitude,
      title: `Contrato ${c.numero}`,
      subtitle: `${c.contratada} · ${c.municipio}`,
    })),
    ...medicoes.flatMap((m) =>
      m.fotos.map((f) => ({
        id: f.id,
        latitude: f.latitude,
        longitude: f.longitude,
        title: `Medição nº ${m.numero} — ${f.categoria}`,
        subtitle: f.observacao,
        imageUrl: f.url,
      }))
    ),
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-white border border-slate-200 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Painel de Fiscalização de Obras
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {db.configuracoes.orgaoNome} · {db.configuracoes.cidadeUf}
          </p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/medicoes')}
            className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            Boletins de Medição
          </button>
          <button
            type="button"
            onClick={() => navigate('/contratos')}
            className="px-4 py-2 text-xs font-medium text-white bg-[#004A8F] rounded-md hover:bg-[#003970] transition-colors whitespace-nowrap shrink-0"
          >
            Gerenciar Contratos
          </button>
        </div>
      </div>

      {/* Primary KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Contratos Ativos"
          value={String(contratosAtivos)}
          subtitle={`${contratos.length} contrato(s) no escopo`}
        />
        <StatCard
          title="Medições Registradas"
          value={String(medicoes.length)}
          subtitle={`${medicoes.filter((m) => m.status === 'PAGA').length} paga(s) · ${
            medicoes.filter((m) => m.status === 'APROVADA').length
          } aprovada(s)`}
        />
        <StatCard
          title="Inconformidades Abertas"
          value={String(ncsAbertas.length)}
          subtitle={
            ncsCriticas > 0
              ? `${ncsCriticas} crítica(s) bloqueante(s)`
              : `Score médio contratadas: ${scoreContratadas}/100`
          }
          tone={ncsCriticas > 0 ? 'danger' : ncsAbertas.length > 0 ? 'warning' : 'success'}
        />
        <StatCard
          title="Execução Física Média"
          value={`${execucaoFisicaMedia.toFixed(1)}%`}
          subtitle={`Financeiro: ${percentualExecutado(valorAtualTotal, executadoTotal).toFixed(1)}%`}
          tone="success"
        />
      </div>

      {/* Financial Consolidation Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Valor Inicial Contratado" value={formatCurrencyBR(valorInicialTotal)} />
        <StatCard title="Aditivos de Valor" value={formatCurrencyBR(valorAditivosTotal)} />
        <StatCard
          title="Total Executado (Medido)"
          value={formatCurrencyBR(executadoTotal)}
          tone="success"
        />
        <StatCard title="Saldo Contratual" value={formatCurrencyBR(saldoTotal)} />
      </div>

      {/* Main Analytics Split: S-Curve + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Curva Físico-Financeira (S-Curve)
              </h2>
              <p className="text-xs text-slate-500">
                Comparativo acumulado previsto vs. executado no exercício 2026
              </p>
            </div>
          </div>
          <div className="h-72 flex-1">
            <Line data={sCurveData} options={sCurveOptions} />
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Alertas & Conformidade ({alertas.length})
            </h2>
            <span className="text-xs text-slate-500">Monitoramento em tempo real</span>
          </div>

          {alertas.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-slate-500 py-10">
              Nenhuma pendência crítica ou vencimento próximo identificado.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 overflow-y-auto max-h-72 pr-1">
              {alertas.map((alerta) => (
                <button
                  key={alerta.id}
                  type="button"
                  onClick={() => alerta.entidadePath && navigate(alerta.entidadePath)}
                  className="w-full text-left py-3 flex items-start gap-3 hover:bg-slate-50 px-2 rounded transition-colors"
                >
                  {alerta.nivel === 'CRITICO' ? (
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                  ) : alerta.nivel === 'ALERTA' ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  ) : (
                    <Info className="w-4 h-4 text-[#004A8F] mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-slate-700">
                      {alerta.tipo}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      {alerta.mensagem}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Split: Contracts Watchlist + Geolocation Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Vigência e Situação dos Contratos
            </h2>
            <button
              type="button"
              onClick={() => navigate('/contratos')}
              className="text-xs font-medium text-[#004A8F] hover:underline"
            >
              Ver todos
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {contratos.map((c) => {
              const dias = calcularDiasRestantes(c.dataFim);
              const cor = vigenciaColor(dias);
              const tone = cor === 'error' ? 'error' : cor === 'warning' ? 'warning' : 'success';
              return (
                <div
                  key={c.id}
                  onClick={() => navigate(`/contratos/${c.id}`)}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50 px-2 rounded transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <span className="font-mono">{c.numero}</span>
                      <span className="text-slate-300">·</span>
                      <span className="truncate">{c.contratada}</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 truncate">
                      {c.municipio} · Término em {formatDateBR(c.dataFim)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-mono tabular-nums font-medium text-slate-700">
                      {formatCurrencyBR(c.valorAtual)}
                    </span>
                    <StatusTag
                      label={dias >= 0 ? `${dias}d restantes` : `Vencido ${Math.abs(dias)}d`}
                      tone={tone}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">
              Mapa de Obras & Registros
            </h2>
            <button
              type="button"
              onClick={() => navigate('/fotos')}
              className="text-xs font-medium text-[#004A8F] hover:underline"
            >
              Abrir galeria
            </button>
          </div>
          <GeoMap markers={mapMarkers} heightClass="h-64" />
        </div>
      </div>

      {/* Recent Audit Log */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-slate-900">
            Trilha de Auditoria Recente
          </h2>
          <button
            type="button"
            onClick={() => navigate('/relatorios')}
            className="text-xs font-medium text-[#004A8F] hover:underline"
          >
            Histórico completo
          </button>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          {db.auditoria.slice(0, 5).map((aud) => (
            <div key={aud.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-slate-700">
                <span className="font-mono text-slate-500">{formatDateBR(aud.data)}</span>
                <span className="text-slate-300">·</span>
                <span className="font-semibold text-slate-900">{aud.usuario}</span>
                <span className="text-slate-300">·</span>
                <span>{aud.detalhes}</span>
              </div>
              <span className="font-mono text-[11px] text-slate-500">{aud.acao}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
