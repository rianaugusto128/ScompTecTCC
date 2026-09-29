import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Factory, Activity, PauseCircle, Siren, Maximize, Minimize, ArrowLeft, Monitor, WifiOff, Clock } from "lucide-react";
import { useMonitoring } from "../../contexts/MonitoringContext";
import { getStatusConfig } from "../../utils/status";
import Logo from "../../components/Logo/Logo";
import { useRelativeDuration } from "../../hooks/useRelativeDuration";
import "./tv.css";

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div className="tv-clock">
    <time dateTime={now.toISOString()}>{now.toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo" })}</time>
    <span>{now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "short", year: "numeric" })} · Brasília</span>
  </div>;
}

function TVStat({ label, value, detail, tone, icon: Icon }) {
  return <article className={`tv-stat tv-stat--${tone}`}>
    <div className="tv-stat-heading"><span>{label}</span><Icon aria-hidden="true" /></div>
    <strong>{value}</strong>
    <span className="tv-stat-detail">{detail}</span>
  </article>;
}

function TVMachineCard({ machine }) {
  const cfg = getStatusConfig(machine.status);
  const Icon = cfg.icon;
  const duration = useRelativeDuration(machine.stateSince);
  const validDate = machine.stateSince && Number.isFinite(Date.parse(machine.stateSince));
  return <article className="tv-machine" data-status={machine.status}>
    <div className="tv-machine-heading">
      <span className="tv-machine-id">{machine.id}</span>
      <span className={`tv-machine-icon ${cfg.text} ${cfg.bg}`}><Icon aria-hidden="true" /></span>
    </div>
    <div className="tv-machine-identity"><h3>{machine.name}</h3><p>{machine.type || "Máquina CNC"}</p></div>
    <div className={`tv-machine-status ${cfg.text}`}><span className={`tv-dot ${cfg.dot}`} />{cfg.label}</div>
    <div className="tv-machine-duration"><span><Clock aria-hidden="true" />Neste estado há</span><strong>{validDate ? duration.formatted : "—"}</strong></div>
  </article>;
}

export default function TVDashboard() {
  const { machines, scopeSummary: summary, loading, connectionError, demoMode, apiConnected, lastSync, activeCompany, activeUnit } = useMonitoring();
  const [fullscreen, setFullscreen] = useState(Boolean(document.fullscreenElement));
  const [fullscreenError, setFullscreenError] = useState("");
  useEffect(() => {
    const sync = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  async function toggleFullscreen() {
    try {
      setFullscreenError("");
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError("Não foi possível ativar a tela cheia neste navegador.");
    }
  }
  const connected = demoMode || (apiConnected && !connectionError);
  const connectionLabel = demoMode ? "Modo demonstração" : loading ? "Conectando…" : connected ? "Monitoramento ativo" : "Sem conexão";
  const alarms = summary.alarms + summary.emergencies;
  const percent = summary.total ? Math.round(summary.operating / summary.total * 100) : 0;
  const placeholder = loading && !machines.length;
  const count = value => placeholder ? "—" : value;
  return <main className="tv-dashboard">
    <header className="tv-header">
      <div className="tv-brand"><Logo size="lg" tagline="" /><div className="tv-brand-caption"><Monitor aria-hidden="true" />Painel de chão de fábrica</div></div>
      <div className="tv-header-tools">
        <div className="tv-connection" data-connected={connected} role="status"><span className="tv-dot" />{connectionLabel}</div>
        <LiveClock />
        <nav className="tv-actions" aria-label="Controles do modo TV">
          <Link to="/dashboard" className="tv-button" aria-label="Voltar ao painel" title="Voltar ao painel"><ArrowLeft aria-hidden="true" /></Link>
          {document.fullscreenEnabled && <button type="button" className="tv-button" onClick={toggleFullscreen} aria-label={fullscreen ? "Sair da tela cheia" : "Ativar tela cheia"} title={fullscreen ? "Sair da tela cheia" : "Ativar tela cheia"}>{fullscreen ? <Minimize aria-hidden="true" /> : <Maximize aria-hidden="true" />}</button>}
        </nav>
      </div>
    </header>
    {fullscreenError && <p className="tv-notice" role="status">{fullscreenError}</p>}
    <section className="tv-overview" aria-labelledby="tv-title">
      <div className="tv-section-heading"><div><p className="tv-eyebrow">Visão da produção</p><h1 id="tv-title">Monitoramento de máquinas</h1></div><p className="tv-scope">{[activeCompany?.name, activeUnit?.name].filter(Boolean).join(" / ") || "Todas as máquinas"}</p></div>
      <div className="tv-stats">
        <TVStat label="Total de CNCs" value={count(summary.total)} detail="Máquinas no escopo atual" icon={Factory} tone="neutral" />
        <TVStat label="Operando" value={count(summary.operating)} detail={summary.total ? `${percent}% das máquinas em operação` : "Aguardando máquinas"} icon={Activity} tone="run" />
        <TVStat label="Paradas" value={count(summary.stopped)} detail="Ciclo de operação parado" icon={PauseCircle} tone="idle" />
        <TVStat label="Alarmes / emergências" value={count(alarms)} detail={`${summary.alarms} alarmes · ${summary.emergencies} emergências`} icon={Siren} tone="danger" />
      </div>
    </section>
    <section className="tv-wall" aria-labelledby="tv-wall-title" aria-busy={loading}>
      <div className="tv-section-heading"><h2 id="tv-wall-title">Estado das máquinas <span className="tv-count">{count(machines.length)}</span></h2><div className="tv-secondary-counts"><span>Manutenção <strong>{count(summary.maintenance)}</strong></span><span>Sem dados atuais <strong>{count(summary.offline)}</strong></span></div></div>
      {machines.length > 0 ? <div className="tv-machine-grid">{machines.map(machine => <TVMachineCard key={machine.id} machine={machine} />)}</div> : <div className="tv-empty" role="status">
        {connectionError ? <WifiOff aria-hidden="true" /> : <Monitor aria-hidden="true" />}
        <h3>{loading ? "Carregando máquinas…" : connectionError ? "Aguardando conexão" : "Nenhuma máquina neste escopo"}</h3>
        <p>{loading ? "Preparando o painel de monitoramento." : connectionError ? "O painel será atualizado quando a conexão for restabelecida." : "As máquinas cadastradas aparecerão aqui automaticamente."}</p>
      </div>}
    </section>
    <footer className="tv-footer"><span>SCOMPTEC <span aria-hidden="true">/</span> Monitoramento CNC</span><span>{demoMode ? "Dados simulados para demonstração" : lastSync ? `Última sincronização: ${lastSync.toLocaleTimeString("pt-BR")}${connectionError ? " · Dados desatualizados" : ""}` : "Aguardando primeira sincronização"}</span></footer>
  </main>;
}
