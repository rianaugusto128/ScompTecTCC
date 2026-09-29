import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Globe2, Search, X, Building2, Radio } from "lucide-react";
import { useMonitoring, SCOPE_TYPES } from "../../contexts/MonitoringContext";
import { machines as baselineMachines } from "../../data/mockData";
import { getContextSeverity, getContextStats, SEVERITY_CONFIG } from "../../utils/severity";

export default function ContextSwitcher() {
  const {
    selectedScope,
    selectedUnitId,
    activeCompany,
    activeUnit,
    availableUnits,
    companies,
    allMachines,
    selectGlobal,
    selectClient,
    selectUnit,
    clearUnit,
    scopeSummary,
  } = useMonitoring();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const filtered = useMemo(
    () => companies.filter((c) => c.name.toLowerCase().includes(query.toLowerCase())),
    [companies, query]
  );

  useEffect(() => {
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const keyboard = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", keyboard);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", keyboard);
    };
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  const choose = (callback) => {
    callback();
    setOpen(false);
    setQuery("");
  };

  const contextLabel = activeUnit
    ? `${activeCompany?.name || "Global"} · ${activeUnit.name}`
    : activeCompany?.name || "Todas as Empresas (Global)";

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={`flex min-w-0 max-w-[200px] sm:max-w-none items-center gap-1.5 sm:gap-2.5 rounded-lg border px-2 sm:px-3 py-1 sm:py-1.5 text-left transition-all duration-200 sm:min-w-[230px] ${
          open
            ? "border-accent/40 bg-base-card shadow-glowGreenSm"
            : "border-base-border bg-base-card/80 hover:border-base-borderLight hover:bg-base-card"
        }`}
      >
        <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent ring-1 ring-accent/30">
          <Globe2 size={13} className="sm:size-[15px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="hidden sm:block text-[9px] font-bold uppercase tracking-[0.14em] text-accent/80 leading-tight">
            Escopo / Empresa
          </span>
          <span className="block truncate text-xs font-semibold text-text-primary">
            {contextLabel}
          </span>
        </span>
        <ChevronDown
          size={12}
          className={`shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180 text-accent" : ""}`}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Trocar contexto"
          className="absolute left-0 top-full z-50 mt-2 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-base-border bg-base-surface/95 shadow-panel backdrop-blur-xl animate-fadeUp"
        >
          {/* Search bar inside switcher */}
          <div className="flex items-center gap-2 border-b border-base-border p-3">
            <Search size={14} className="text-text-muted" />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar por nome do cliente..."
              className="min-w-0 flex-1 bg-transparent text-xs text-text-primary outline-none placeholder:text-text-muted"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Limpar busca"
                className="text-text-muted hover:text-text-primary"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div className="max-h-[380px] overflow-y-auto p-1.5 space-y-1">
            {/* Global option */}
            <button
              onClick={() => choose(selectGlobal)}
              className={`flex w-full items-center gap-3 rounded-lg p-2.5 text-left transition-all ${
                selectedScope.type === SCOPE_TYPES.GLOBAL && !selectedUnitId
                  ? "border border-accent/30 bg-accent-soft text-accent"
                  : "hover:bg-base-cardHover text-text-primary"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-accent/20 text-accent">
                <Globe2 size={13} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold">Todas as Empresas (Visão Global)</span>
                <span className="text-[11px] text-text-muted">Consolidação central SCOMPTEC ({allMachines.length} CNCs)</span>
              </span>
              {selectedScope.type === SCOPE_TYPES.GLOBAL && !selectedUnitId && (
                <Check size={14} className="text-accent" />
              )}
            </button>

            {/* If a client is selected, show Unit filters */}
            {selectedScope.type === SCOPE_TYPES.CLIENT && availableUnits.length > 0 && (
              <div className="border-y border-base-border/70 my-1 py-1.5 px-2 bg-base-card/40 rounded-lg">
                <div className="flex items-center justify-between pb-1 px-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-text-muted">
                    Filtrar por Unidade Fabril
                  </span>
                  {selectedUnitId && (
                    <button
                      onClick={clearUnit}
                      className="text-[10px] text-accent font-semibold hover:underline"
                    >
                      Todas as Unidades
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1 mt-1">
                  {availableUnits.map((u) => {
                    const isUnitSelected = selectedUnitId === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => {
                          if (isUnitSelected) clearUnit();
                          else selectUnit(u.id);
                        }}
                        className={`text-[10px] font-semibold px-2 py-1 rounded-md border transition-all ${
                          isUnitSelected
                            ? "border-accent bg-accent/20 text-accent shadow-glowGreenSm"
                            : "border-base-border bg-base-surface text-text-secondary hover:border-accent/40 hover:text-white"
                        }`}
                      >
                        {u.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="px-3 pt-2.5 pb-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
                Empresas Clientes Monitoradas ({filtered.length})
              </p>
            </div>

            {filtered.map((company) => {
              const list = allMachines.filter((m) => m.companyId === company.id);
              const stats = getContextStats(
                company,
                list,
                baselineMachines.filter((machine) => machine.companyId === company.id)
              );
              const emergency = stats.emergencies,
                offline = stats.offline,
                stopped = stats.machinesStopped,
                alarm = stats.alarms;
              const summary = { emergency, offline, stopped, alarms: alarm };
              const severityCfg = SEVERITY_CONFIG[getContextSeverity(summary)];
              const isSelected = selectedScope.type === SCOPE_TYPES.CLIENT && selectedScope.id === company.id;

              return (
                <button
                  key={company.id}
                  onClick={() => choose(() => selectClient(company.id))}
                  className={`flex w-full items-start gap-2.5 rounded-lg p-2.5 text-left transition-all ${
                    isSelected
                      ? "border border-accent/30 bg-accent-soft"
                      : "hover:bg-base-cardHover border border-transparent"
                  }`}
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${severityCfg.dot}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-text-primary">
                      {company.name}
                    </span>
                    <span className="mt-0.5 block text-[11px] text-text-muted">
                      {company.machines} CNCs · <strong className="text-accent">{stats.machinesOperating} operando</strong>
                    </span>
                    {(emergency > 0 || alarm > 0 || stopped > 0 || offline > 0) && (
                      <span className="mt-1 flex flex-wrap gap-1 text-[10px]">
                        {emergency > 0 && (
                          <span className="rounded bg-rose-500/15 px-1 py-0.2 font-semibold text-rose-400">
                            {emergency} emergência
                          </span>
                        )}
                        {alarm > 0 && (
                          <span className="rounded bg-orange-500/15 px-1 py-0.2 font-semibold text-orange-400">
                            {alarm} alarme
                          </span>
                        )}
                        {stopped > 0 && (
                          <span className="rounded bg-slate-500/15 px-1 py-0.2 text-slate-300">
                            {stopped} paradas
                          </span>
                        )}
                      </span>
                    )}
                  </span>
                  {isSelected && <Check size={14} className="mt-1 text-accent shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

