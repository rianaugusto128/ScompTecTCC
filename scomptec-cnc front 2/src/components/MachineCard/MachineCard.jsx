import { useNavigate } from "react-router-dom";
import { ArrowRight, Zap, Gauge, Wifi, WifiOff, Clock, Thermometer, Activity } from "lucide-react";
import StatusBadge from "../StatusBadge/StatusBadge";
import { getStateDurationLabel, getStatusConfig, MACHINE_STATUS, getTelemetrySummary } from "../../utils/status";
import { useRelativeDuration } from "../../hooks/useRelativeDuration";
import { formatDateTime, formatRelativeTime } from "../../utils/time";
import { SCOPE_TYPES, useMonitoring } from "../../contexts/MonitoringContext";
import { isActiveProblem } from "../../utils/problems";

export default function MachineCard({ machine }) {
  const navigate = useNavigate();
  const { selectedScope, companies, units } = useMonitoring();
  const cfg = getStatusConfig(machine.status);
  const Icon = cfg.icon;
  const disconnected = [MACHINE_STATUS.SEM_COMUNICACAO, MACHINE_STATUS.DADOS_DESATUALIZADOS].includes(machine.status);
  const duration = useRelativeDuration(machine.stateSince);
  const company = companies.find((item) => item.id === machine.companyId);
  const unit = units.find((item) => item.id === machine.unitId);
  const showContext = selectedScope.type === SCOPE_TYPES.GLOBAL;
  const isRunning = machine.status === MACHINE_STATUS.OPERANDO;
  const telemetry = getTelemetrySummary(machine);

  return (
    <button
      onClick={() => navigate(`/maquinas/${machine.id}`)}
      className={`group panel relative flex w-full flex-col justify-between p-4 sm:p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:bg-base-cardHover hover:shadow-cardHover focus-visible:border-accent ${
        isRunning ? "border-base-border hover:border-accent/50" : cfg.border
      } ${machine.isNew ? "animate-criticalEvent" : ""}`}
    >
      {/* Subtle top specular gradient */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent group-hover:via-accent/40" />

      {/* Ambient background glow for active running state or problems */}
      {isRunning && (
        <div className="pointer-events-none absolute -right-12 -top-12 h-28 w-28 rounded-full bg-accent/5 blur-2xl group-hover:bg-accent/10" />
      )}

      <div className="w-full">
        {/* Header: Machine ID, Type & Status Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-wider text-accent bg-accent/10 px-2.5 py-0.5 rounded border border-accent/25 shadow-glowGreenSm">
                {machine.id}
              </span>
              <span className="text-[11px] font-medium text-text-muted truncate">{machine.type}</span>
            </div>

            <h3 className="mt-2.5 block truncate text-sm font-bold text-text-primary group-hover:text-accent transition-colors">
              {machine.name}
            </h3>

            {showContext && (
              <p className="mt-1 text-[11px] text-text-muted truncate">
                {company?.name} · <span className="text-text-dim">{unit?.name}</span>
              </p>
            )}
          </div>

          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-transform duration-200 group-hover:scale-105 ${cfg.border} ${cfg.bg} ${cfg.text}`}
          >
            <Icon size={17} strokeWidth={2.2} />
          </div>
        </div>

        {/* Status Badge & State Ticker */}
        <div className="mt-4 flex items-center justify-between gap-3 border-y border-base-border/70 py-3">
          <StatusBadge status={machine.status} size="sm" isNew={machine.isNew} />
          <div className="text-right">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {getStateDurationLabel(machine.status)}
            </span>
            <span className={`data-mono text-xs font-bold tracking-tight ${isRunning ? "text-accent" : cfg.text}`}>
              {disconnected ? formatRelativeTime(machine.lastCommunicationAt).replace("há ", "") : duration.formatted}
            </span>
          </div>
        </div>

        {/* Telemetry 2x2 Strip (Current, Power, Temp, Voltage) */}
        {!disconnected && machine.current !== null && (
          <div className="mt-3.5 space-y-1.5">
            <div className="grid grid-cols-2 gap-2 rounded-lg border border-base-border/60 bg-base-surface/60 p-2.5 text-xs">
              <div className="flex items-center justify-between min-w-0">
                <span className="flex items-center gap-1 text-[11px] text-text-muted">
                  <Zap size={12} className="text-accent shrink-0" />
                  <span>Corr.:</span>
                </span>
                <span className={`data-mono font-bold ${telemetry?.current?.isAbnormal ? "text-amber-400 font-extrabold" : "text-text-primary"}`}>
                  {machine.current} A
                </span>
              </div>
              <div className="flex items-center justify-between border-l border-base-border/60 pl-2 min-w-0">
                <span className="flex items-center gap-1 text-[11px] text-text-muted">
                  <Activity size={12} className="text-accent shrink-0" />
                  <span>Potência:</span>
                </span>
                <span className={`data-mono font-bold ${telemetry?.power?.isUnusual ? "text-amber-400 font-extrabold" : "text-text-primary"}`}>
                  {machine.powerKw ?? "—"} kW
                </span>
              </div>
            </div>

            {/* Abnormality badge if current or temp out of range */}
            {telemetry?.hasTelemetryAbnormality && (
              <div className="flex items-center justify-between rounded-md border border-amber-500/25 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-400 font-semibold">
                <span>{telemetry.current.isAbnormal ? telemetry.current.label : telemetry.temperature.label}</span>
                <span className="font-mono">{machine.current} A / {machine.currentLimit || 22} A</span>
              </div>
            )}

            {/* Zero consumption unusual note */}
            {telemetry?.power?.isUnusual && !telemetry?.hasTelemetryAbnormality && (
              <div className="flex items-center justify-between rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[10px] text-amber-300 font-medium">
                <span>Consumo zero em operação</span>
                <span className="font-mono">0.0 kW</span>
              </div>
            )}
          </div>
        )}

        {/* Disconnected State Alert Note */}
        {disconnected && (
          <div className="mt-3.5 rounded-lg border border-base-border bg-base-surface/80 p-2.5 text-[11px] text-text-secondary">
            <div className="flex items-center gap-1.5 text-text-muted">
              <WifiOff size={12} className="text-slate-400" />
              <span>Último estado:</span>
              <strong className="font-semibold text-text-primary">{machine.lastKnownStatus || "Sem dados"}</strong>
            </div>
          </div>
        )}

        {/* Active Problem Alert */}
        {isActiveProblem(machine.status) && !disconnected && (
          <div className="mt-3 flex items-center justify-between text-[11px] text-text-muted px-0.5">
            <span>Parada de produção:</span>
            <strong className={`data-mono font-bold ${cfg.text}`}>{duration.formatted}</strong>
          </div>
        )}
      </div>

      {/* Footer: Communication timestamp & Arrow */}
      <div className="mt-4 flex items-center justify-between border-t border-base-border/70 pt-3 text-[11px] text-text-muted">
        <span className="flex items-center gap-1.5">
          {disconnected ? (
            <WifiOff size={12} className="text-slate-500" />
          ) : (
            <Wifi size={12} className="text-accent" />
          )}
          <span>{formatRelativeTime(machine.lastCommunicationAt)}</span>
        </span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-muted transition-colors group-hover:text-accent">
          <span>Detalhes</span>
          <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
        </span>
      </div>
    </button>
  );
}

