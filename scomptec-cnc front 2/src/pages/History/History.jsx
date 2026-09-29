import { useMemo, useState } from "react";
import { History as HistoryIcon, Filter, Radio, ArrowRight, Zap, Cpu, BellRing, Clock } from "lucide-react";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import EmptyState from "../../components/EmptyState/EmptyState";
import OccurrenceCard from "../../components/OccurrenceCard/OccurrenceCard";
import { useMonitoring } from "../../contexts/MonitoringContext";
import { MACHINE_STATUS, STATUS_CONFIG } from "../../utils/status";
import { Link } from "react-router-dom";

export default function History() {
  const { allEvents, allMachines, history, demoMode } = useMonitoring();
  const [machineFilter, setMachineFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL"); // "ALL" | "EMERGENCIA" | "ALARME" | "PARADA" | "OPERANDO" | "TELEMETRIA" | "DEVICE"
  const [viewMode, setViewMode] = useState("cards"); // "cards" | "table"

  const filtered = useMemo(() => {
    return allEvents.filter((event) => {
      if (machineFilter !== "ALL" && event.machineId !== machineFilter) {
        return false;
      }

      if (categoryFilter === "EMERGENCIA") {
        return event.status === MACHINE_STATUS.EMERGENCIA || event.severity === "EMERGENCIA";
      }
      if (categoryFilter === "ALARME") {
        return event.status === MACHINE_STATUS.ALARME || event.severity === "ALARME";
      }
      if (categoryFilter === "PARADA") {
        return event.status === MACHINE_STATUS.PARADA;
      }
      if (categoryFilter === "OPERANDO") {
        return event.status === MACHINE_STATUS.OPERANDO || event.type === "OPERATION_RESUMED";
      }
      if (categoryFilter === "TELEMETRIA") {
        return event.type === "TELEMETRY_ANOMALY" || event.type === "UNUSUAL_SITUATION";
      }
      if (categoryFilter === "DEVICE") {
        return event.type === "DEVICE_REASSIGNED" || event.status === MACHINE_STATUS.SEM_COMUNICACAO;
      }

      return true;
    });
  }, [allEvents, machineFilter, categoryFilter]);

  return (
    <div className="space-y-6 animate-fadeUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
              Histórico e Ocorrências da Operação
            </h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent-soft px-2.5 py-0.5 text-[10px] font-bold text-accent">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              {allEvents.length} REGISTROS
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            {demoMode ? "Auditoria demonstrativa de ocorrências." : "Últimas 100 leituras por CNC, recuperadas do banco de dados. O histórico completo está disponível na API paginada."}
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 rounded-lg border border-base-border bg-base-card p-1 self-start sm:self-auto">
          <button
            onClick={() => setViewMode("cards")}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
              viewMode === "cards" ? "bg-accent-soft text-accent" : "text-text-muted hover:text-white"
            }`}
          >
            Cards Detalhados
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`rounded px-2.5 py-1 text-xs font-semibold transition-all ${
              viewMode === "table" ? "bg-accent-soft text-accent" : "text-text-muted hover:text-white"
            }`}
          >
            Tabela Compacta
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {[
          ["ALL", "Todas as Ocorrências"],
          ["EMERGENCIA", "Emergências"],
          ["ALARME", "Alarmes Fabris"],
          ["TELEMETRIA", "Telemetria & Consumo"],
          ["PARADA", "Paradas"],
          ["OPERANDO", "Operação"],
          ["DEVICE", "Gateways Arduino Opta WiFi"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setCategoryFilter(key)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all border ${
              categoryFilter === key
                ? "border-accent bg-accent/15 text-accent shadow-glowGreenSm"
                : "border-base-border bg-base-surface/80 text-text-secondary hover:border-accent/30 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Machine Filter Bar */}
      <div className="panel p-4 flex flex-col gap-3 sm:flex-row sm:items-center bg-base-surface/80">
        <div className="flex items-center gap-2 text-xs font-bold text-accent mr-2">
          <Filter size={15} />
          <span>Filtrar CNC:</span>
        </div>

        <select
          value={machineFilter}
          onChange={(e) => setMachineFilter(e.target.value)}
          className="input-field sm:w-72 text-xs"
        >
          <option value="ALL">Todas as Máquinas CNC ({allMachines.length})</option>
          {allMachines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id} — {m.name}
            </option>
          ))}
        </select>

        {machineFilter !== "ALL" && (
          <button
            onClick={() => setMachineFilter("ALL")}
            className="text-xs text-accent font-semibold hover:underline ml-auto"
          >
            Limpar filtro de máquina
          </button>
        )}
      </div>

      {/* History Content */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhuma ocorrência encontrada"
          description="Nenhum evento registrado correspondente aos filtros de categoria e máquina selecionados."
        />
      ) : viewMode === "cards" ? (
        <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((event) => (
            <OccurrenceCard
              key={event.id}
              event={event}
              machine={allMachines.find((m) => m.id === event.machineId)}
            />
          ))}
        </div>
      ) : (
        <div className="panel overflow-hidden bg-base-surface/60">
          <div className="border-b border-base-border/70 bg-base-card/80 px-4 py-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-text-muted">
            <div className="flex items-center gap-6">
              <span className="w-20">Horário</span>
              <span className="w-24">ID CNC</span>
              <span className="hidden sm:block">Evento / Mensagem</span>
            </div>
            <span>Estado</span>
          </div>

          <div className="divide-y divide-base-border/70">
            {filtered.map((item) => {
              const machine = allMachines.find((m) => m.id === item.machineId);
              const isLive = item.id.startsWith("live-") || item.id.startsWith("telemetry-");

              return (
                <Link
                  key={item.id}
                  to={`/maquinas/${item.machineId}`}
                  className="flex items-center justify-between px-4 py-3 text-xs transition-colors hover:bg-base-cardHover group"
                >
                  <div className="flex items-center gap-6 min-w-0">
                    <span className="data-mono w-20 font-semibold text-text-muted">
                      {item.time}
                    </span>
                    <span className="data-mono w-24 font-bold text-accent group-hover:underline">
                      {item.machineId}
                    </span>
                    <span className="hidden sm:block truncate text-text-secondary group-hover:text-text-primary">
                      {item.text || machine?.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    {item.status ? (
                      <StatusBadge status={item.status} size="sm" isNew={isLive} />
                    ) : (
                      <span className="font-mono text-[10px] text-text-muted">EVENTO</span>
                    )}
                    <ArrowRight size={13} className="text-text-dim opacity-0 group-hover:opacity-100 group-hover:text-accent transition-all group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


