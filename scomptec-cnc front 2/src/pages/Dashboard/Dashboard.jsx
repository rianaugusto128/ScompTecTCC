import { Link, useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Factory,
  PauseCircle,
  Siren,
  WifiOff,
} from "lucide-react";
import MachineCard from "../../components/MachineCard/MachineCard";
import AlertCard from "../../components/AlertCard/AlertCard";
import OccurrenceCard from "../../components/OccurrenceCard/OccurrenceCard";
import UtilizationChart from "../../components/charts/UtilizationChart";
import EmptyState from "../../components/EmptyState/EmptyState";
import { useMachines, useDashboardSummary } from "../../hooks/useMachines";
import { useAlerts } from "../../hooks/useAlerts";
import { utilizationSeries } from "../../data/mockData";
import { useMonitoring, SCOPE_TYPES } from "../../contexts/MonitoringContext";

function MetricButton({ label, value, icon: Icon, tone, onClick, isPrimary = false }) {
  return (
    <button
      onClick={onClick}
      className={`group relative flex items-center gap-2.5 sm:gap-3.5 p-3 sm:p-4 text-left transition-all duration-200 hover:bg-base-cardHover ${
        isPrimary ? "bg-accent/[0.04]" : ""
      }`}
    >
      <div
        className={`flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${tone.border} ${tone.bg} ${tone.text}`}
      >
        <Icon size={16} className="sm:size-[18px]" strokeWidth={2.2} />
      </div>

      <div className="min-w-0 flex-1">
        <strong className={`data-mono block text-xl sm:text-2xl font-extrabold tracking-tight ${tone.text}`}>
          {value}
        </strong>
        <span className="block text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">
          {label}
        </span>
      </div>

      <ArrowRight
        size={14}
        className="ml-auto text-text-muted opacity-0 transition-all duration-200 group-hover:translate-x-1 group-hover:opacity-100 group-hover:text-accent"
      />
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { machines } = useMachines();
  const { summary } = useDashboardSummary();
  const { alerts, markAlertResolved } = useAlerts();
  const {
    demoMode,
    loading,
    connectionError,
    activeCompany,
    selectedScope,
    allMachines,
    recentEvents = [],
  } = useMonitoring();

  const openStatus = (status) => {
    navigate(`/maquinas?status=${status}`);
  };

  const isGlobal = selectedScope.type === SCOPE_TYPES.GLOBAL;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeUp">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-3 sm:gap-4 lg:flex-row lg:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="eyebrow text-accent">
              {isGlobal ? "Visão Global SCOMPTEC" : `Monitoramento · ${activeCompany?.name}`}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
              </span>
              TEMPO REAL
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {isGlobal
              ? "Painel centralizado consolidando todas as empresas clientes, unidades fabris e controladores CNC."
              : `Visão operacional dedicada para ${activeCompany?.name} (${machines.length} máquinas monitoradas).`}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* 11: OPERATIONAL HEALTH STATUS STRIP (Resumo de Saúde)         */}
      {/* ------------------------------------------------------------- */}
      <section className="panel p-3.5 sm:p-4 bg-base-surface/80 border-base-border">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-text-muted">
            <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
            <span>Status da Operação CNC:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2.5 py-1 text-accent font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_#10B981]" />
              <strong>{summary.operating}</strong> normais
            </span>

            {summary.stopped > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-slate-300">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                <strong>{summary.stopped}</strong> paradas
              </span>
            )}

            {summary.alarms > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/30 bg-orange-500/10 px-2.5 py-1 text-orange-400 font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 shadow-[0_0_6px_#f97316]" />
                <strong>{summary.alarms}</strong> em alarme
              </span>
            )}

            {summary.emergencies > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-rose-500/40 bg-rose-500/15 px-2.5 py-1 text-rose-400 font-bold shadow-glowGreenSm">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] animate-ping" />
                <strong>{summary.emergencies}</strong> em emergência
              </span>
            )}

            {summary.offline > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-slate-400">
                <WifiOff size={12} />
                <strong>{summary.offline}</strong> sem comunicação
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Top Metric Telemetry Ribbon */}
      <section className="panel overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-base-border/70 p-4 sm:p-5 bg-base-surface/40">
          <div className="flex items-center gap-3 sm:gap-3.5">
            <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl bg-accent/15 border border-accent/30 text-accent shadow-glowGreenSm">
              <Factory size={20} className="sm:size-[22px]" strokeWidth={2.2} />
            </div>
            <div>
              <span className="eyebrow text-accent">
                {isGlobal ? "Total Geral de CNCs Monitoradas" : `Parque CNC · ${activeCompany?.name}`}
              </span>
              <div className="flex items-baseline gap-2">
                <strong className="data-mono text-2xl sm:text-3xl font-extrabold text-white">
                  {summary.total}
                </strong>
                <span className="text-xs font-semibold text-text-muted">Máquinas Ativas</span>
              </div>
            </div>
          </div>

          <div className="mt-2.5 sm:mt-0 flex items-center gap-2 font-mono text-xs text-text-muted">
            <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_#10B981]" />
            <span>Taxa de Atividade:</span>
            <strong className="text-accent font-bold">
              {summary.total > 0 ? Math.round((summary.operating / summary.total) * 100) : 0}%
            </strong>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-base-border/70 sm:grid-cols-5 sm:divide-y-0 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <MetricButton
            label="Operando"
            value={summary.operating}
            icon={Activity}
            isPrimary={true}
            tone={{
              bg: "bg-accent/15",
              border: "border-accent/30",
              text: "text-accent",
            }}
            onClick={() => openStatus("OPERANDO")}
          />
          <MetricButton
            label="Paradas"
            value={summary.stopped}
            icon={PauseCircle}
            tone={{
              bg: "bg-slate-800/80",
              border: "border-slate-700",
              text: "text-slate-300",
            }}
            onClick={() => openStatus("PARADA")}
          />
          <MetricButton
            label="Alarmes"
            value={summary.alarms}
            icon={AlertTriangle}
            tone={{
              bg: "bg-amber-500/10",
              border: "border-amber-500/20",
              text: "text-amber-400",
            }}
            onClick={() => openStatus("ALARME")}
          />
          <MetricButton
            label="Emergências"
            value={summary.emergencies}
            icon={Siren}
            tone={{
              bg: "bg-rose-500/10",
              border: "border-rose-500/30",
              text: "text-rose-400",
            }}
            onClick={() => openStatus("EMERGENCIA")}
          />
          <MetricButton
            label="Offline"
            value={summary.offline}
            icon={WifiOff}
            tone={{
              bg: "bg-slate-800/80",
              border: "border-slate-700",
              text: "text-slate-400",
            }}
            onClick={() => openStatus("SEM_COMUNICACAO")}
          />
        </div>
      </section>

      {/* Main Charts & Attention Section */}
      <div className="grid gap-6 xl:grid-cols-3">
        {/* Utilization Chart */}
        <section className="panel p-5 xl:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-base-border/70 pb-3">
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                Alertas e Saúde das Máquinas
              </h2>
              <p className="text-xs text-text-muted">Operação normal na base. Alarmes e emergências elevam a curva.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-accent/20 bg-accent/5 px-2 py-1 text-[10px] font-mono font-bold text-accent">
                HISTÓRICO RELATIVO
              </span>
            </div>
          </div>
          <UtilizationChart machines={machines} data={demoMode ? utilizationSeries : undefined} loading={loading} error={connectionError} />
        </section>

        {/* Attention Required / Active Alerts */}
        <section className="panel p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-base-border/70 pb-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-text-primary">Atenção Imediata</h2>
                <span className="rounded-full bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 text-[10px] font-bold text-rose-400">
                  {alerts.length}
                </span>
              </div>
              <Link to="/alertas" className="text-xs font-semibold text-accent hover:underline">
                Ver todos
              </Link>
            </div>

            <div className="mt-3.5">
              {alerts.length === 0 ? (
                <EmptyState
                  title="Nenhum problema ativo"
                  description="Todas as máquinas monitoradas estão em conformidade operacional."
                />
              ) : (
                <div className="space-y-2.5">
                  {alerts.slice(0, 5).map((alert) => (
                    <AlertCard key={alert.id} alert={alert} />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-base-border/70 pt-3">
            <Link
              to="/alertas"
              className="btn-secondary !py-2 text-xs w-full justify-between"
            >
              <span>Central de Alertas e Notificações</span>
              <ArrowRight size={13} className="text-accent" />
            </Link>
          </div>
        </section>
      </div>

      {/* CNC Machines Fleet */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-text-primary">
              Status das Máquinas CNC
            </h2>
            <p className="text-xs text-text-muted">Monitoramento ao vivo dos controladores e sensores</p>
          </div>
          <Link
            to="/maquinas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline"
          >
            <span>Ver todas as {machines.length} máquinas</span>
            <ArrowRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 sm:gap-5">
          {machines.slice(0, 8).map((machine) => (
            <MachineCard key={machine.id} machine={machine} />
          ))}
        </div>
      </section>

      {/* Recent Occurrences / Event Timeline */}
      <section className="space-y-4">
        <div>
          <h2 className="text-base font-extrabold tracking-tight text-text-primary">
            Últimas Ocorrências Registradas
          </h2>
          <p className="text-xs text-text-muted">
            Auditoria cronológica de transições de estado, paradas e normalizações do parque.
          </p>
        </div>

        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {recentEvents.slice(0, 9).map((event) => (
            <OccurrenceCard
              key={event.id}
              event={event}
              machine={allMachines.find((machine) => machine.id === event.machineId)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

