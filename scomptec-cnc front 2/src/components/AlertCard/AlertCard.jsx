import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { getStatusConfig } from "../../utils/status";
import { useRelativeDuration } from "../../hooks/useRelativeDuration";

export default function AlertCard({ alert }) {
  const cfg = getStatusConfig(alert.severity);
  const Icon = cfg.icon;
  const startedAt = alert.occurredAt || alert.stateSince || new Date(Date.now() - (alert.minutesAgo || 0) * 60000).toISOString();
  const duration = useRelativeDuration(startedAt);

  return (
    <Link
      to={`/maquinas/${alert.machineId}`}
      className={`group relative flex items-start gap-3.5 rounded-xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/40 hover:bg-base-cardHover ${cfg.border} bg-base-surface/70`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-transform duration-200 group-hover:scale-105 ${cfg.border} ${cfg.bg} ${cfg.text}`}
      >
        <Icon size={16} strokeWidth={2.3} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>
            {cfg.label}
          </span>
          <span className="font-mono text-[10px] text-text-muted">
            {duration.formatted}
          </span>
        </div>

        <p className="mt-0.5 truncate text-xs font-bold text-text-primary group-hover:text-accent transition-colors">
          <span className="font-mono text-accent">{alert.machineId}</span> · {alert.machineName}
        </p>

        <p className="mt-0.5 truncate text-[11px] text-text-muted">
          {alert.companyName} · {alert.unitName}
        </p>
      </div>

      <ChevronRight
        size={15}
        className="mt-2.5 shrink-0 text-text-dim transition-transform duration-200 group-hover:translate-x-1 group-hover:text-accent"
      />
    </Link>
  );
}

