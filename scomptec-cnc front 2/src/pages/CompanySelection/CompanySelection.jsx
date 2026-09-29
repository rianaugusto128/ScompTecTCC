import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Clock3,
  Factory,
  Search,
  ShieldAlert,
  WifiOff,
  Globe2,
  CheckCircle2,
  Cpu,
} from "lucide-react";
import Logo from "../../components/Logo/Logo";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import { readSessionUser } from "../../services/adminSession";
import { useMonitoring } from "../../contexts/MonitoringContext";
import { MACHINE_STATUS, formatDuration } from "../../utils/status";
import ClientCard from "../../components/ClientCard/ClientCard";

const isProblem = (status) =>
  [MACHINE_STATUS.EMERGENCIA, MACHINE_STATUS.ALARME, MACHINE_STATUS.PARADA, MACHINE_STATUS.SEM_COMUNICACAO].includes(
    status
  );

export default function CompanySelection() {
  const navigate = useNavigate();
  const { companies, units, alerts, allMachines: machines, selectGlobal, selectClient } = useMonitoring();
  const [query, setQuery] = useState("");
  const user = readSessionUser();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "Operador";
  const filteredCompanies = companies.filter((company) =>
    company.name.toLowerCase().includes(query.toLowerCase())
  );
  const problems = machines
    .filter((machine) => isProblem(machine.status))
    .sort((a, b) => b.stateMinutes - a.stateMinutes);

  const counts = {
    machines: machines.length,
    operating: machines.filter(m => m.status === "OPERANDO").length,
    stopped: machines.filter(m => m.status === "PARADA").length,
    alarm: machines.filter(m => m.status === "ALARME").length,
    emergency: machines.filter(m => m.status === "EMERGENCIA").length,
    offline: machines.filter(m => m.status === "SEM_COMUNICACAO").length,
  };

  const access = (id) => {
    if (id === "ALL") selectGlobal();
    else selectClient(id);
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-base-bg text-text-primary">
      {/* Top Header */}
      <header className="border-b border-base-border bg-base-surface/90 backdrop-blur-xl sticky top-0 z-30">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3.5 py-3 sm:px-6 sm:py-4 lg:px-8">
          <Logo size="md" />
          <div className="flex items-center gap-1.5 sm:gap-2 rounded-full border border-accent/30 bg-accent-soft px-2.5 sm:px-3 py-1 text-[10px] sm:text-xs font-semibold text-accent shrink-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-accent" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_#10B981]" />
            </span>
            <span className="hidden sm:inline">CENTRAL DE COMANDO ONLINE</span>
            <span className="sm:hidden font-mono font-bold">100% ONLINE</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 sm:space-y-8 px-3.5 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10 animate-fadeUp">
        {/* Welcome greeting */}
        <section className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <span className="eyebrow text-accent">Central de Operações SCOMPTEC</span>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-4xl text-white">
              Bem-vindo, {firstName}.
            </h1>
            <p className="mt-1 text-xs text-text-muted">
              Selecione um cliente para auditar o parque fabril ou acesse a visão global de telemetria.
            </p>
          </div>
        </section>

        {/* Executive Summary Card */}
        <section className="panel border-accent/30 shadow-glowGreen overflow-hidden">
          <div className="flex flex-col gap-3.5 border-b border-base-border/70 p-4 sm:p-5 lg:px-7 sm:flex-row sm:items-center sm:justify-between bg-base-surface/70">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent border border-accent/30 shadow-glowGreenSm">
                <Globe2 size={18} className="sm:size-5" strokeWidth={2.2} />
              </div>
              <div>
                <h2 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                  Visão Global SCOMPTEC (Multi-Tenant)
                </h2>
                <p className="text-[11px] sm:text-xs text-text-muted">
                  Painel consolidado com todos os clientes, unidades e CNCs.
                </p>
              </div>
            </div>

            <button onClick={() => access("ALL")} className="btn-primary w-full sm:w-auto text-xs py-2.5 sm:py-2 justify-center">
              <span>Acessar Dashboard Geral</span>
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="grid grid-cols-4 divide-x divide-y divide-base-border/70 sm:grid-cols-4 lg:grid-cols-8 lg:divide-y-0 bg-base-card/40">
            {[
              ["Clientes", companies.length, Building2, "text-white"],
              ["Unidades", units.length, Factory, "text-white"],
              ["Máquinas", counts.machines, Cpu, "text-white"],
              ["Operando", counts.operating, Activity, "text-accent font-extrabold"],
              ["Paradas", counts.stopped, Clock3, "text-slate-300"],
              ["Alarmes", counts.alarm, AlertTriangle, "text-amber-400"],
              ["Emergências", counts.emergency, ShieldAlert, "text-rose-400"],
              ["Offline", counts.offline, WifiOff, "text-slate-400"],
            ].map(([label, value, Icon, tone]) => (
              <div key={label} className="p-2 sm:p-4 text-center sm:text-left">
                <Icon size={14} className={`${tone} mx-auto sm:mx-0 sm:size-4`} />
                <p className={`data-mono mt-1 sm:mt-2.5 text-lg sm:text-2xl font-extrabold ${tone}`}>{value}</p>
                <p className="mt-0.5 text-[8px] sm:text-[10px] font-bold uppercase tracking-wider text-text-muted truncate">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 2-Column Split: Client list vs Active Critical Problems */}
        <div className="grid gap-6 sm:gap-8 xl:grid-cols-[1.15fr_.85fr]">
          <section className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white">Clientes Industriais</h2>
                <p className="text-xs text-text-muted">Selecione uma empresa para isolar o contexto operacional.</p>
              </div>
              <span className="font-mono text-[11px] sm:text-xs text-accent font-bold bg-accent/10 border border-accent/20 px-2 sm:px-2.5 py-0.5 rounded-full">
                {companies.length} CLIENTES
              </span>
            </div>

            <div className="relative">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-field pl-9 text-xs"
                placeholder="Filtrar cliente por nome..."
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {filteredCompanies.map((company) => (
                <ClientCard key={company.id} company={company} />
              ))}
            </div>
          </section>

          <section className="space-y-3.5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldAlert size={17} className="text-rose-400" />
                <h2 className="text-base sm:text-lg font-bold text-white">Atenção Prioritária</h2>
              </div>
              <p className="text-xs text-text-muted">{alerts.length} eventos críticos que exigem intervenção.</p>
            </div>

            <div className="panel divide-y divide-base-border/70 overflow-hidden bg-base-surface/80">
              {problems.length === 0 ? (
                <div className="p-8 text-center text-xs text-text-muted">
                  <CheckCircle2 size={24} className="text-accent mx-auto mb-2" />
                  Nenhum problema crítico ativo no momento.
                </div>
              ) : (
                problems.slice(0, 6).map((machine) => {
                  const company = companies.find((c) => c.id === machine.companyId);
                  return (
                    <button
                      key={machine.id}
                      onClick={() => {
                        selectClient(machine.companyId);
                        navigate(`/maquinas/${machine.id}`);
                      }}
                      className="group flex w-full items-center justify-between gap-3 p-3.5 sm:p-4 text-left transition-colors hover:bg-base-cardHover"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <StatusBadge status={machine.status} size="sm" />
                        <div className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-bold text-text-primary group-hover:text-accent transition-colors">
                            <span className="font-mono text-accent">{machine.id}</span> · {machine.name}
                          </span>
                          <span className="block truncate text-[10px] sm:text-[11px] text-text-muted">{company?.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="data-mono text-[11px] sm:text-xs font-semibold text-text-muted">
                          {formatDuration(machine.stateMinutes)}
                        </span>
                        <ArrowRight size={13} className="text-text-dim transition-transform group-hover:translate-x-1 group-hover:text-accent" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
