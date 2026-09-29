import { useState, useRef, useEffect } from "react";
import { Menu, Search, Bell, ChevronDown, Sliders, Shield, LogOut } from "lucide-react";
import { clearSession, readSessionUser } from "../../services/adminSession";
import { useMonitoring } from "../../contexts/MonitoringContext";
import ContextSwitcher from "../ContextSwitcher/ContextSwitcher";
import { getStatusConfig } from "../../utils/status";
import { Link } from "react-router-dom";
import { usePreferences } from "../../services/preferences";

const ROLE_LABEL = { ADMIN_SCOMPTEC: "Administrador Geral", admin: "Administrador Geral", ADMIN: "Administrador Geral", CLIENTE: "Cliente Industrial" };
const alertKey = (alert) => JSON.stringify([alert.id, alert.severity, alert.occurredAt || alert.stateSince]);

export default function Header({ onMenuClick }) {
  const preferences = usePreferences();
  const currentUser = readSessionUser() || { name: "Visitante", role: null, email: "" };
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [readAlerts, setReadAlerts] = useState(() => new Set());
  const alertsRef = useRef(null);
  const bellRef = useRef(null);
  const { alerts, demoMode, apiConnected, connectionError, loading } = useMonitoring();
  const menuRef = useRef(null);
  const alertCount = alerts.filter((alert) => !readAlerts.has(alertKey(alert))).length;
  const markRead = (items) => setReadAlerts((current) => new Set([...current, ...items.map(alertKey)]));
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
      if (alertsRef.current && !alertsRef.current.contains(e.target)) {
        setAlertsOpen(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        if (alertsRef.current?.contains(document.activeElement)) bellRef.current?.focus();
        setAlertsOpen(false);
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between gap-2 sm:gap-4 border-b border-base-border bg-base-surface/90 px-3 sm:px-6 lg:px-8 backdrop-blur-xl">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          aria-label="Abrir menu"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-base-border/70 bg-base-card/80 text-text-secondary transition-colors hover:border-accent/40 hover:bg-base-cardHover hover:text-accent lg:hidden"
        >
          <Menu size={18} />
        </button>
        <ContextSwitcher />
      </div>

      {/* Global Quick Search (Desktop) */}
      <div className="relative hidden max-w-md flex-1 items-center md:flex">
        <Search size={15} className="pointer-events-none absolute left-3.5 text-text-muted" />
        <input
          placeholder="Buscar máquinas, CNCs, setores ou alertas..."
          className="w-full rounded-lg border border-base-border bg-base-card/80 py-2 pl-9 pr-14 text-xs text-text-primary placeholder:text-text-muted transition-all hover:border-base-borderLight focus:border-accent focus:bg-base-card focus:outline-none focus:ring-1 focus:ring-accent/30"
        />
        <span className="pointer-events-none absolute right-2.5 rounded border border-base-border bg-base-surface px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
          ⌘K
        </span>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Live sync pill */}
        <div className="hidden items-center gap-2 rounded-full border border-accent/20 bg-accent/[0.06] px-3 py-1 text-[11px] font-medium text-accent md:flex">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-accent" />
          </span>
          <span title={connectionError || ""}>{demoMode ? "DEMONSTRAÇÃO" : loading ? "CONECTANDO" : apiConnected ? "CONECTADO" : "BACKEND INDISPONÍVEL"}</span>
        </div>

        {/* Notifications */}
        <div ref={alertsRef} className="relative" onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setAlertsOpen(false);
        }}>
        <button
          ref={bellRef}
          type="button"
          onClick={() => { setAlertsOpen((open) => !open); setUserMenuOpen(false); }}
          aria-expanded={alertsOpen}
          aria-controls="header-alerts"
          aria-label={`Notificações: ${alertCount} alertas não lidos`}
          title="Central de alertas"
          className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-base-border bg-base-card/60 text-text-secondary transition-all hover:border-accent/30 hover:bg-base-cardHover hover:text-accent"
        >

          <Bell size={16} />

          {preferences.showBadge && alertCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-base-bg shadow-[0_0_8px_#10B981]">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </button>
        {alertsOpen && (
          <section id="header-alerts" aria-label="Notificações" className="fixed left-3 right-3 top-16 overflow-hidden rounded-xl border border-base-border bg-base-surface shadow-panel sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
            <div className="flex items-center justify-between gap-2 border-b border-base-border px-3 py-2.5">
              <div>
                <h2 className="text-sm font-bold text-text-primary">Notificações</h2>
                <p className="text-[11px] text-text-muted">{alerts.length} alertas ativos · {alertCount} não lidos</p>
              </div>
              {alertCount > 0 && <button type="button" onClick={() => markRead(alerts)} className="max-w-24 text-right text-[11px] leading-tight font-semibold text-accent hover:underline">Marcar todos como lidos</button>}
            </div>
            <ul className="max-h-[40vh] overflow-y-auto divide-y divide-base-border">
              {alerts.map((alert) => {
                const config = getStatusConfig(alert.severity);
                const Icon = config.icon;
                const unread = !readAlerts.has(alertKey(alert));
                return (
                  <li key={alertKey(alert)}>
                    <Link to={`/maquinas/${encodeURIComponent(alert.machineId)}`} onClick={() => { markRead([alert]); setAlertsOpen(false); }} className={`flex items-start gap-2.5 transition-colors hover:bg-base-cardHover focus-visible:bg-base-cardHover ${preferences.compactAlerts ? "px-3 py-2.5" : "p-4"}`}>
                      <Icon size={16} className={`mt-0.5 shrink-0 ${config.text}`} />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-bold ${config.text}`}>{config.label}</p>
                        <p className="mt-0.5 break-words text-xs text-text-primary">{alert.machineName || alert.machineId}</p>
                        <p className="mt-0.5 text-[11px] text-text-muted">{alert.machineId} · Ver CNC</p>
                      </div>
                      {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" aria-label="Não lido" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
            {alerts.length === 0 && <p className="p-4 text-center text-xs text-text-muted">{loading ? "Carregando alertas..." : connectionError ? "Não foi possível atualizar os alertas." : "Nenhum alerta ativo neste contexto."}</p>}
            <Link to="/alertas" onClick={() => setAlertsOpen(false)} className="block border-t border-base-border py-2 px-3 text-center text-xs font-semibold text-accent hover:bg-base-cardHover">Ver todos os alertas</Link>
          </section>
        )}
        </div>

        {/* User profile dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => { setUserMenuOpen((v) => !v); setAlertsOpen(false); }}
            className="flex items-center gap-2 rounded-lg border border-base-border bg-base-card/60 p-1 sm:p-1.5 sm:pr-2.5 transition-all hover:border-base-borderLight hover:bg-base-cardHover"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/15 text-accent ring-1 ring-accent/30 font-mono text-xs font-bold">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden text-left sm:block">
              <span className="block text-xs font-semibold leading-tight text-text-primary">
                {currentUser.name}
              </span>
              <span className="block text-[10px] font-medium text-accent/80">
                {ROLE_LABEL[currentUser.role] || "Operador"}
              </span>
            </div>
            <ChevronDown
              size={12}
              className={`text-text-muted transition-transform duration-200 ${userMenuOpen ? "rotate-180 text-accent" : ""
                }`}
            />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-base-border bg-base-surface/95 p-1.5 shadow-panel backdrop-blur-xl animate-fadeUp">
              <div className="border-b border-base-border px-3 py-2.5">
                <p className="text-xs font-semibold text-text-primary">{currentUser.name}</p>
                <p className="text-[11px] text-text-muted">{currentUser.email}</p>
              </div>

              <div className="py-1">
                <Link
                  to="/configuracoes"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-base-cardHover hover:text-accent"
                >
                  <Sliders size={14} />
                  <span>Configurações da conta</span>
                </Link>
                <Link
                  to="/selecionar-empresa"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:bg-base-cardHover hover:text-accent"
                >
                  <Shield size={14} />
                  <span>Central de Monitoramento</span>
                </Link>
              </div>

              <div className="border-t border-base-border pt-1">
                <Link
                  to="/login"
                  onClick={() => { clearSession(); setUserMenuOpen(false); }}
                  className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs font-medium text-rose-400 transition-colors hover:bg-rose-500/10"
                >
                  <LogOut size={14} />
                  <span>Encerrar sessão</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
