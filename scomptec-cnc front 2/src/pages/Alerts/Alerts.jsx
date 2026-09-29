import { useMemo, useState } from "react";
import { BellRing, Filter, ShieldAlert, AlertTriangle, Siren, CheckCircle2, Clock } from "lucide-react";
import AlertCard from "../../components/AlertCard/AlertCard";
import EmptyState from "../../components/EmptyState/EmptyState";
import LoadingState from "../../components/LoadingState/LoadingState";
import { useAlerts } from "../../hooks/useAlerts";
import { useMonitoring } from "../../contexts/MonitoringContext";

const SEVERITIES = [
  { value: "ALL", label: "Todas as Severidades" },
  { value: "EMERGENCIA", label: "Emergência (Crítico)" },
  { value: "ALARME", label: "Alarme Operacional" },
  { value: "PARADA", label: "Parada Não Programada" },
  { value: "SEM_COMUNICACAO", label: "Sem Comunicação (Offline)" },
];

export default function Alerts() {
  const { alerts, loading } = useAlerts();
  const { companies, units } = useMonitoring();
  const [severity, setSeverity] = useState("ALL");
  const [companyId, setCompanyId] = useState("ALL");
  const [unitId, setUnitId] = useState("ALL");

  const filteredUnits = units.filter((u) => companyId === "ALL" || u.companyId === companyId);

  const filtered = useMemo(() => {
    return alerts.filter((a) => {
      const matchesSeverity = severity === "ALL" || a.severity === severity;
      const company = companies.find((c) => c.name === a.companyName);
      const matchesCompany = companyId === "ALL" || company?.id === companyId;
      const unit = units.find((u) => u.name === a.unitName);
      const matchesUnit = unitId === "ALL" || unit?.id === unitId;
      return matchesSeverity && matchesCompany && matchesUnit;
    });
  }, [alerts, severity, companyId, unitId]);

  const emergencyCount = alerts.filter((a) => a.severity === "EMERGENCIA").length;
  const alarmCount = alerts.filter((a) => a.severity === "ALARME").length;
  const stoppedCount = alerts.filter((a) => a.severity === "PARADA").length;

  return (
    <div className="space-y-6 animate-fadeUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
              Central de Alertas e Notificações
            </h1>
            <span className="rounded-full bg-accent-soft border border-accent/30 px-2.5 py-0.5 text-[10px] font-bold text-accent">
              {alerts.length} ATIVOS
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Monitoramento de anomalias, emergências de segurança e paradas não programadas em tempo real.
          </p>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
        <div className="panel p-3.5 sm:p-4 flex items-center justify-between border-l-4 border-rose-500 bg-base-surface/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Emergências Ativas</span>
            <p className="data-mono text-xl sm:text-2xl font-extrabold text-rose-400 mt-0.5">{emergencyCount}</p>
          </div>
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Siren size={18} className="sm:size-5" strokeWidth={2.2} />
          </div>
        </div>

        <div className="panel p-3.5 sm:p-4 flex items-center justify-between border-l-4 border-amber-500 bg-base-surface/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Alarmes de Operação</span>
            <p className="data-mono text-xl sm:text-2xl font-extrabold text-amber-400 mt-0.5">{alarmCount}</p>
          </div>
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle size={18} className="sm:size-5" strokeWidth={2.2} />
          </div>
        </div>

        <div className="panel p-3.5 sm:p-4 flex items-center justify-between border-l-4 border-slate-600 bg-base-surface/60">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300">Paradas Registradas</span>
            <p className="data-mono text-xl sm:text-2xl font-extrabold text-slate-300 mt-0.5">{stoppedCount}</p>
          </div>
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-slate-800 text-slate-300 border border-slate-700">
            <Clock size={18} className="sm:size-5" strokeWidth={2.2} />
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="panel p-3.5 sm:p-4 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:flex-wrap bg-base-surface/80">
        <div className="flex items-center gap-2 text-xs font-bold text-accent">
          <Filter size={14} />
          <span>Filtros:</span>
        </div>

        <select
          value={severity}
          onChange={(e) => setSeverity(e.target.value)}
          className="input-field w-full sm:w-48 text-xs"
        >
          {SEVERITIES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          value={companyId}
          onChange={(e) => {
            setCompanyId(e.target.value);
            setUnitId("ALL");
          }}
          className="input-field w-full sm:w-52 text-xs"
        >
          <option value="ALL">Todos os Clientes Industriais</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={unitId}
          onChange={(e) => setUnitId(e.target.value)}
          className="input-field w-full sm:w-52 text-xs"
        >
          <option value="ALL">Todas as Unidades Fabris</option>
          {filteredUnits.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>

        {(severity !== "ALL" || companyId !== "ALL" || unitId !== "ALL") && (
          <button
            onClick={() => {
              setSeverity("ALL");
              setCompanyId("ALL");
              setUnitId("ALL");
            }}
            className="btn-secondary !py-2 text-xs w-full sm:w-auto justify-center"
          >
            Limpar filtros
          </button>
        )}
      </div>

      {/* Alerts List */}
      {loading ? (
        <LoadingState rows={4} />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Nenhum alerta ativo encontrado"
          description="Todas as máquinas correspondentes aos filtros operam dentro dos parâmetros normais."
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <AlertCard key={a.id} alert={a} />
          ))}
        </div>
      )}
    </div>
  );
}

