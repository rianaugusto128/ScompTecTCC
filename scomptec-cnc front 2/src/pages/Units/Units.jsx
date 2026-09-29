import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MapPin, ChevronRight, Factory, Building2, Filter } from "lucide-react";

import { useMonitoring } from "../../contexts/MonitoringContext";
import { getContextSeverity, SEVERITY_CONFIG } from "../../utils/severity";
import StatusBadge from "../../components/StatusBadge/StatusBadge";

export default function Units() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companies, units, sectors, allMachines, selectUnit } = useMonitoring();
  const [companyId, setCompanyId] = useState(searchParams.get("cliente") || "ALL");

  useEffect(() => {
    const requested = searchParams.get("cliente");
    if (requested) setCompanyId(requested);
  }, [searchParams]);

  const filteredUnits = units.filter((unit) => companyId === "ALL" || unit.companyId === companyId);

  const openMachines = (unitId, sectorId) => {
    selectUnit(unitId);
    navigate(`/maquinas?unidade=${unitId}${sectorId ? `&setor=${sectorId}` : ""}`);
  };

  return (
    <div className="space-y-6 animate-fadeUp">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-extrabold tracking-tight text-text-primary">
              Unidades e Plantas Fabris
            </h1>
            <span className="rounded-full bg-accent-soft border border-accent/30 px-2.5 py-0.5 text-[10px] font-bold text-accent">
              {units.length} UNIDADES
            </span>
          </div>
          <p className="mt-1 text-xs text-text-muted">
            Hierarquia de plantas e setores monitorados com agregação de severidade em tempo real.
          </p>
        </div>
      </div>

      {/* Filter Selector */}
      <div className="panel p-4 flex items-center gap-3 bg-base-surface/80">
        <div className="flex items-center gap-2 text-xs font-bold text-accent mr-1">
          <Filter size={15} />
          <span>Filtrar Empresa:</span>
        </div>
        <select
          value={companyId}
          onChange={(event) => setCompanyId(event.target.value)}
          className="input-field sm:w-64 text-xs"
        >
          <option value="ALL">Todos os Clientes</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </select>
      </div>

      {/* Units List */}
      <div className="space-y-4">
        {filteredUnits.map((unit) => {
          const unitSectors = sectors.filter((sector) => sector.unitId === unit.id);
          const unitMachines = allMachines.filter((machine) => machine.unitId === unit.id);
          const severity = getContextSeverity(unitMachines);
          const cfg = SEVERITY_CONFIG[severity];
          const company = companies.find((c) => c.id === unit.companyId);

          return (
            <article
              key={unit.id}
              className={`panel p-5 border-l-4 ${cfg.border} bg-base-card transition-all hover:border-accent/40`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${cfg.border} ${cfg.bg} ${cfg.text}`}
                  >
                    <MapPin size={18} strokeWidth={2.2} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary">{unit.name}</h3>
                    <p className="text-xs text-text-muted">
                      {company?.name} · {unitSectors.length} setores ·{" "}
                      <strong className="text-text-primary">{unitMachines.length} CNCs</strong>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-md border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${cfg.border} ${cfg.bg} ${cfg.text}`}
                  >
                    {severity}
                  </span>
                  <button
                    onClick={() => openMachines(unit.id)}
                    className="btn-secondary !py-1.5 !px-3 text-xs"
                  >
                    <span>Ver Máquinas</span>
                    <ChevronRight size={13} className="text-accent" />
                  </button>
                </div>
              </div>

              {/* Sectors Grid */}
              {unitSectors.length > 0 && (
                <div className="mt-5 grid gap-2.5 border-t border-base-border/70 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                  {unitSectors.map((sector) => {
                    const sectorMachines = unitMachines.filter((m) => m.sectorId === sector.id);
                    const sectorCfg = SEVERITY_CONFIG[getContextSeverity(sectorMachines)];
                    const operatingCount = sectorMachines.filter((m) => m.status === "OPERANDO").length;

                    return (
                      <button
                        key={sector.id}
                        onClick={() => openMachines(unit.id, sector.id)}
                        className={`group flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition-all ${sectorCfg.border} bg-base-surface/60 hover:bg-base-cardHover hover:border-accent/40`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`h-2 w-2 shrink-0 rounded-full ${sectorCfg.dot}`} />
                            <span className="truncate text-xs font-bold text-text-primary group-hover:text-accent transition-colors">
                              {sector.name}
                            </span>
                          </div>
                          <span className="mt-1 block text-[11px] text-text-muted">
                            {operatingCount}/{sectorMachines.length} operando
                          </span>
                        </div>

                        <ChevronRight
                          size={14}
                          className="text-text-dim transition-transform group-hover:translate-x-1 group-hover:text-accent"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

