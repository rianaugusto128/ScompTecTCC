import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  Factory,
  BellRing,
  History,
  Building2,
  MapPin,
  Cpu,
  Settings,
  LogOut,
  X,
  Tv,
  ShieldCheck,
} from "lucide-react";
import Logo from "../Logo/Logo";
import { useMonitoring } from "../../contexts/MonitoringContext";
import { clearSession, isAdminUser, readSessionUser } from "../../services/adminSession";

const monitoringLinks = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { to: "/maquinas", label: "Máquinas", icon: Factory },
  { to: "/alertas", label: "Alertas", icon: BellRing },
  { to: "/historico", label: "Histórico", icon: History },
];

const adminLinks = [
  { to: "/clientes", label: "Clientes", icon: Building2 },
  { to: "/unidades", label: "Unidades", icon: MapPin },
  { to: "/dispositivos", label: "Dispositivos", icon: Cpu },
];

function NavItem({ to, label, icon: Icon, onNavigate, badge }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
          isActive
            ? "bg-accent-soft text-accent shadow-[inset_0_1px_0_rgba(16,185,129,0.2)] font-semibold"
            : "text-text-secondary hover:bg-base-cardHover hover:text-text-primary"
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent shadow-[0_0_8px_#10B981]" />
          )}
          <Icon
            size={17}
            strokeWidth={isActive ? 2.3 : 1.8}
            className={`shrink-0 transition-colors ${
              isActive ? "text-accent" : "text-text-muted group-hover:text-accent"
            }`}
          />
          <span className="truncate">{label}</span>
          {badge && (
            <span className="ml-auto rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent">
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export default function Sidebar({ open = false, onClose }) {
  const navigate = useNavigate();
  const { scopeSummary } = useMonitoring();

  const handleLogout = () => {
    clearSession();
    navigate("/login");
  };

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md lg:hidden transition-opacity duration-300"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-base-border bg-base-surface/98 shadow-2xl backdrop-blur-xl transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:max-w-none lg:shadow-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between border-b border-base-border/70 px-4 py-4 sm:px-5">
          <Logo size="md" />
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-base-border/70 bg-base-card text-text-muted transition-colors hover:border-accent/40 hover:text-accent lg:hidden"
          >
            <X size={16} />
          </button>
        </div>

        {/* System Online Status Pill */}
        <div className="mx-3 mt-3.5 mb-1 flex items-center justify-between rounded-lg border border-accent/20 bg-accent/[0.04] px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-pulseRing rounded-full bg-accent" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent shadow-[0_0_6px_#10B981]" />
            </span>
            <span className="text-[11px] font-semibold text-accent">TELEMETRIA ATIVA</span>
          </div>
          <span className="font-mono text-[10px] text-text-muted shrink-0">GATEWAY CNC</span>
        </div>

        {/* Navigation Section */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          <div className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-accent/80">
              Monitoramento
            </p>
            <NavItem to="/dashboard" label="Dashboard Geral" icon={LayoutGrid} onNavigate={onClose} />
            <NavItem to="/maquinas" label="Máquinas CNC" icon={Factory} onNavigate={onClose} badge={scopeSummary?.total} />
            <NavItem
              to="/alertas"
              label="Alertas"
              icon={BellRing}
              onNavigate={onClose}
              badge={scopeSummary?.alarms + scopeSummary?.emergencies > 0 ? `${scopeSummary?.alarms + scopeSummary?.emergencies}` : null}
            />
            <NavItem to="/historico" label="Ocorrências" icon={History} onNavigate={onClose} />
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
              Administração & IoT
            </p>
            {isAdminUser(readSessionUser()) && <NavItem to="/admin" label="Central administrativa" icon={ShieldCheck} onNavigate={onClose} />}
            <NavItem to="/clientes" label="Clientes" icon={Building2} onNavigate={onClose} />
            <NavItem to="/unidades" label="Unidades" icon={MapPin} onNavigate={onClose} />
            <NavItem to="/dispositivos" label="Módulos Arduino Opta WiFi" icon={Cpu} onNavigate={onClose} />
          </div>

          <div className="space-y-1">
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.16em] text-text-muted">
              Ferramentas & Exibição
            </p>
            <NavLink
              to="/tv"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-base-cardHover hover:text-accent"
            >
              <Tv size={17} strokeWidth={1.8} className="shrink-0 text-text-muted group-hover:text-accent" />
              <span>Modo TV (Fábrica)</span>
              <span className="ml-auto rounded border border-accent/30 bg-accent/10 px-1.5 py-0.5 text-[9px] font-bold text-accent">
                LIVE
              </span>
            </NavLink>
          </div>
        </nav>

        {/* Bottom Actions */}
        <div className="space-y-1 border-t border-base-border bg-base-surface px-3 py-3">
          <NavItem to="/configuracoes" label="Configurações" icon={Settings} onNavigate={onClose} />
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-text-muted transition-colors hover:bg-rose-500/10 hover:text-rose-400"
          >
            <LogOut size={17} strokeWidth={1.8} className="shrink-0" />
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>
    </>
  );
}
