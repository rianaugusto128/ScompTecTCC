import { ArrowRight, Clock3, Building2, Factory } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { machines as baselineMachines } from "../../data/mockData";
import { useMonitoring } from "../../contexts/MonitoringContext";
import { getContextSeverity, getContextStats, SEVERITY_CONFIG } from "../../utils/severity";
import { formatRelativeTime } from "../../utils/time";

export default function ClientCard({ company, compact = false }) {
  const navigate = useNavigate();
  const { selectClient, allMachines, allAlerts } = useMonitoring();
  const companyMachines = allMachines.filter((machine) => machine.companyId === company.id);
  const baseline = baselineMachines.filter((machine) => machine.companyId === company.id);
  const stats = getContextStats(company, companyMachines, baseline);
  const severity = getContextSeverity({
    emergencies: stats.emergencies,
    alarms: stats.alarms,
    stopped: stats.machinesStopped,
    offline: stats.offline,
  });
  const cfg = SEVERITY_CONFIG[severity];
  const latest = allAlerts.find((alert) => companyMachines.some((machine) => machine.id === alert.machineId));
  const latestWhen = latest?.occurredAt
    ? formatRelativeTime(latest.occurredAt)
    : latest
    ? `há ${latest.minutesAgo} min`
    : null;

  const view = () => {
    selectClient(company.id);
    navigate("/dashboard");
  };

  return (
    <article
      className={`group panel relative flex flex-col justify-between transition-all duration-200 hover:-translate-y-1 hover:border-accent/40 hover:bg-base-cardHover hover:shadow-cardHover ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 border border-accent/20 text-accent font-bold">
              <Building2 size={18} />
            </div>
            <div>
              <h3 className="truncate font-bold text-text-primary group-hover:text-accent transition-colors text-sm sm:text-base">
                {company.name}
              </h3>
              <p className="text-xs text-text-muted">
                {company.units} {company.units === 1 ? "unidade" : "unidades"} · {company.machines} máquinas CNC
              </p>
            </div>
          </div>

          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.border} ${cfg.bg} ${cfg.text}`}>
            {severity}
          </span>
        </div>

        {/* Operating status chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-accent/25 bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">
            <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_6px_#10B981]" />
            {stats.machinesOperating} ativos
          </span>
          {stats.machinesStopped > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/60 px-2.5 py-1 text-xs font-medium text-slate-300">
              {stats.machinesStopped} paradas
            </span>
          )}
          {stats.alarms > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
              {stats.alarms} alarme
            </span>
          )}
          {stats.emergencies > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-400">
              {stats.emergencies} emergência
            </span>
          )}
        </div>

        {!compact && (
          <div className="mt-4 border-t border-base-border/70 pt-3 text-xs">
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <Clock3 size={12} className="text-accent" />
              Última ocorrência relevante
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {latest ? (
                <>
                  <span className="font-mono font-bold text-accent">{latest.machineId}</span> ·{" "}
                  {latest.severity === "EMERGENCIA"
                    ? "Emergência"
                    : latest.severity === "SEM_COMUNICACAO"
                    ? "Sem comunicação"
                    : latest.severity}
                  {" · "}
                  <span className="text-text-muted">{latestWhen}</span>
                </>
              ) : (
                <span className="text-text-muted">Nenhuma ocorrência crítica ativa</span>
              )}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-base-border/70 pt-3">
        <button
          onClick={view}
          className="btn-secondary !py-1.5 !px-3 text-xs w-full justify-between group-hover:border-accent/40"
        >
          <span>Acessar Painel do Cliente</span>
          <ArrowRight size={13} className="text-accent transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </article>
  );
}

