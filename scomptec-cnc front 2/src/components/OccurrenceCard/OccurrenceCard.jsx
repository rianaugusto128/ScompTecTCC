import { Link } from "react-router-dom";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  AlertCircle,
  Zap,
  Thermometer,
  Activity,
  Cpu,
  RefreshCw,
  AlertTriangle,
  Siren,
  WifiOff,
} from "lucide-react";
import { useRelativeDuration } from "../../hooks/useRelativeDuration";
import { formatDateTime, formatDuration, formatRelativeTime } from "../../utils/time";
import { getStatusConfig, MACHINE_STATUS } from "../../utils/status";
import { isActiveProblem } from "../../utils/problems";

const COPY = {
  [MACHINE_STATUS.EMERGENCIA]: ["Emergência acionada na máquina.", "A máquina permanece em emergência"],
  [MACHINE_STATUS.ALARME]: ["Alarme de operação identificado.", "A máquina permanece em alarme"],
  [MACHINE_STATUS.PARADA]: ["Parada de produção registrada.", "Permanece parada"],
  [MACHINE_STATUS.MANUTENCAO]: ["Máquina em ordem de manutenção.", "Permanece em manutenção"],
  [MACHINE_STATUS.SEM_COMUNICACAO]: ["Gateway offline sem telemetria.", "A máquina permanece sem comunicação"],
  [MACHINE_STATUS.OPERANDO]: ["Operação iniciada com sucesso.", "Permanece operando"],
};

export default function OccurrenceCard({ event, machine }) {
  const resolved = event.type === "PROBLEM_RESOLVED";
  const resumed = event.type === "OPERATION_RESUMED";
  const isTelemetryAnomaly = event.type === "TELEMETRY_ANOMALY";
  const isUnusual = event.type === "UNUSUAL_SITUATION";
  const isReassigned = event.type === "DEVICE_REASSIGNED";

  const displayStatus = resolved ? event.resolvedStatus : event.status;
  const cfg = getStatusConfig(displayStatus);
  const isHealthy = resolved || resumed || event.status === MACHINE_STATUS.OPERANDO;
  
  let Icon = resolved || resumed ? CheckCircle2 : cfg.icon;
  if (isTelemetryAnomaly) Icon = Zap;
  if (isUnusual) Icon = Activity;
  if (isReassigned) Icon = Cpu;

  const elapsed = useRelativeDuration(event.occurredAt);
  const relative = formatRelativeTime(event.occurredAt, new Date(event.occurredAt).getTime() + elapsed.seconds * 1000);
  const active = !resolved && isActiveProblem(event.status) && machine?.status === event.status;
  const copy = COPY[event.status] || [`Estado alterado para ${cfg.label}.`, `Permanece em ${cfg.label.toLowerCase()}`];

  return (
    <Link
      to={`/maquinas/${event.machineId}`}
      className={`group panel relative flex flex-col justify-between p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-base-cardHover hover:shadow-cardHover ${
        isTelemetryAnomaly
          ? "border-amber-500/30 bg-amber-500/[0.02]"
          : isUnusual
          ? "border-amber-400/30 bg-amber-400/[0.02]"
          : isReassigned
          ? "border-accent/30 bg-accent/[0.02]"
          : isHealthy
          ? "border-base-border hover:border-accent/40"
          : cfg.border
      }`}
    >
      <div>
        <div className="flex items-start gap-3">
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-105 ${
              isTelemetryAnomaly
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                : isUnusual
                ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                : isReassigned
                ? "border-accent/30 bg-accent/15 text-accent shadow-glowGreenSm"
                : isHealthy
                ? "border-accent/30 bg-accent-soft text-accent shadow-glowGreenSm"
                : `${cfg.border} ${cfg.bg} ${cfg.text}`
            }`}
          >
            <Icon size={17} strokeWidth={2.2} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span
                className={`text-[10px] font-bold uppercase tracking-wider ${
                  isTelemetryAnomaly
                    ? "text-amber-400"
                    : isUnusual
                    ? "text-amber-300"
                    : isReassigned
                    ? "text-accent"
                    : isHealthy
                    ? "text-accent"
                    : cfg.text
                }`}
              >
                {isTelemetryAnomaly
                  ? "Telemetria Fora da Faixa"
                  : isUnusual
                  ? "Situação Incomum"
                  : isReassigned
                  ? "Associação de Módulo"
                  : resumed
                  ? "Operação Normalizada"
                  : resolved
                  ? `${getStatusConfig(event.resolvedStatus).label} Encerrada`
                  : cfg.label}
              </span>
              <span className="font-mono text-[10px] text-text-muted" title={formatDateTime(event.occurredAt)}>
                {relative}
              </span>
            </div>

            <div className="mt-1 flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-accent">{event.machineId}</span>
              <span className="truncate text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">
                {event.machineName || machine?.name}
              </span>
            </div>
            <p className="text-[11px] text-text-muted truncate">
              {event.companyName} · <span className="text-text-dim">{event.unitName || "Unidade"}</span>
            </p>
          </div>
        </div>

        {/* Event description */}
        <div className="mt-3.5 rounded-lg border border-base-border/50 bg-base-surface/50 p-2.5 text-xs text-text-secondary">
          <p className="font-medium text-text-primary">
            {isTelemetryAnomaly || isUnusual || isReassigned
              ? event.text
              : resumed
              ? `A máquina voltou a operar ${relative}.`
              : resolved
              ? "A máquina retomou a operação normal."
              : copy[0]}
          </p>

          {event.detail && (
            <p className="mt-1 text-[11px] font-mono text-amber-400/90">
              {event.detail}
            </p>
          )}

          {resumed && (
            <p className="mt-1 text-[11px] text-text-muted">
              Tempo indisponível: <strong className="data-mono font-semibold text-text-primary">{formatDuration(event.unavailableDurationSeconds || 0, { showSeconds: true })}</strong>
            </p>
          )}
          {resolved && (
            <p className="mt-1 text-[11px] text-text-muted">
              Duração do evento: <strong className="data-mono font-semibold text-text-primary">{formatDuration(event.durationSeconds || 0, { showSeconds: true })}</strong>
            </p>
          )}
          {active && !isTelemetryAnomaly && (
            <p className="mt-1 text-[11px] text-text-muted">
              {copy[1]} há <strong className={`data-mono font-semibold ${cfg.text}`}>{elapsed.formatted}</strong>
            </p>
          )}
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-end gap-1 text-xs font-semibold text-text-muted group-hover:text-accent transition-colors">
        <span>Ver máquina</span>
        <ChevronRight size={13} className="transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

