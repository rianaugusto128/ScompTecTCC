import TelemetryChart from "../../components/charts/TelemetryChart";
import { Link, useParams } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  Cpu,
  History,
  Radio,
  Wifi,
  WifiOff,
  Zap,
  Gauge,
  Thermometer,
  Clock,
  AlertTriangle,
  Signal,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import StatusBadge from "../../components/StatusBadge/StatusBadge";
import LoadingState from "../../components/LoadingState/LoadingState";
import OperatingTimeline from "../../components/OperatingTimeline/OperatingTimeline";
import MesaSignals from "../../components/MesaSignals/MesaSignals";
import MachineIncidents from "../../components/MachineIncidents/MachineIncidents";
import { useMachine } from "../../hooks/useMachines";

import { useRelativeDuration } from "../../hooks/useRelativeDuration";
import { formatDuration, formatRelativeTime } from "../../utils/time";
import { getStateDurationLabel, getStatusConfig, MACHINE_STATUS, evaluateCurrent, evaluateTemperature, evaluatePower, getTelemetrySummary } from "../../utils/status";
import { isActiveProblem } from "../../utils/problems";
import { useMonitoring } from "../../contexts/MonitoringContext";

function MetricGauge({ label, value, unit, icon: Icon, tone = "text-text-primary", subtitle, progress }) {
  return (
    <div className="panel p-4 flex flex-col justify-between space-y-3 bg-base-surface/60 border-base-border/70 hover:border-accent/30 transition-all">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-text-muted">{label}</span>
        {Icon && <Icon size={15} className="text-accent" />}
      </div>
      <div>
        <div className="flex items-baseline gap-1">
          <span className={`data-mono text-2xl font-extrabold tracking-tight ${tone}`}>{value}</span>
          {unit && <span className="text-xs font-semibold text-text-muted">{unit}</span>}
        </div>
        {subtitle && <p className="mt-0.5 text-[10px] text-text-dim">{subtitle}</p>}
      </div>
      {progress !== undefined && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-base-surface border border-base-border/50">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-accent shadow-[0_0_6px_#10B981]"
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono = false }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-base-border/70 py-2.5 text-xs last:border-0">
      <span className="text-text-muted">{label}</span>
      <span className={`text-right font-medium text-text-primary ${mono ? "data-mono font-semibold" : ""}`}>
        {value}
      </span>
    </div>
  );
}

export default function MachineDetails() {
  const { id } = useParams();
  const { machine, loading } = useMachine(id);
  const { allEvents, companies, sectors, units, demoMode } = useMonitoring();
  const stateDuration = useRelativeDuration(machine?.stateSince);

  if (loading) return <LoadingState rows={5} />;
  if (!machine) {
    return (
      <div className="panel p-12 text-center space-y-4">
        <p className="text-sm font-semibold text-text-secondary">Máquina CNC não encontrada no sistema.</p>
        <Link to="/maquinas" className="btn-primary">
          <ArrowLeft size={15} /> Voltar para lista de máquinas
        </Link>
      </div>
    );
  }

  const company = companies.find((item) => item.id === machine.companyId);
  const unit = units.find((item) => item.id === machine.unitId);
  const sector = sectors.find((item) => item.id === machine.sectorId);
  const machineEvents = allEvents.filter((item) => item.machineId === machine.id);
  const cfg = getStatusConfig(machine.status);
  const problem = isActiveProblem(machine.status);
  const disconnected = [MACHINE_STATUS.SEM_COMUNICACAO, MACHINE_STATUS.DADOS_DESATUALIZADOS].includes(machine.status);
  const isRunning = machine.status === MACHINE_STATUS.OPERANDO;

  const telemetrySummary = getTelemetrySummary(machine);

  const operationalTotal =
    machine.operatingTimeToday + machine.stoppedTimeToday + machine.alarmTimeToday + machine.emergencyTimeToday;
  const availability = operationalTotal ? Math.round((machine.operatingTimeToday / operationalTotal) * 100) : 0;

  // Comparison metrics calculations
  const curVal = machine.current ?? 0;
  const curAvg = machine.currentAvg ?? null;
  const curDiff = curAvg > 0 ? (((curVal - curAvg) / curAvg) * 100).toFixed(1) : "0.0";
  const curTrend = Number(curDiff) > 1.5 ? "UP" : Number(curDiff) < -1.5 ? "DOWN" : "STABLE";

  const tempVal = machine.temperature ?? 0;
  const tempAvg = machine.temperatureAvg ?? null;
  const tempDiff = tempAvg > 0 ? (((tempVal - tempAvg) / tempAvg) * 100).toFixed(1) : "0.0";
  const tempTrend = Number(tempDiff) > 1.0 ? "UP" : Number(tempDiff) < -1.0 ? "DOWN" : "STABLE";

  const powerVal = machine.powerKw ?? 0;
  const powerAvg = machine.powerAvg ?? null;
  const powerDiff = powerAvg > 0 ? (((powerVal - powerAvg) / powerAvg) * 100).toFixed(1) : "0.0";


  return (
    <div className="space-y-6 animate-fadeUp">
      {/* Navigation Breadcrumb back */}
      <Link
        to="/maquinas"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-accent"
      >
        <ArrowLeft size={14} /> Voltar para o parque de máquinas
      </Link>

      {/* Main Machine Cockpit Header */}
      <MesaSignals machine={machine} />
      <header className={`panel p-6 border-l-4 ${cfg.border} bg-gradient-to-r from-base-surface via-base-card to-base-surface`}>
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-start">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-extrabold tracking-wider text-accent bg-accent/15 px-2.5 py-0.5 rounded border border-accent/30 shadow-glowGreenSm">
                {machine.id}
              </span>
              <span className="text-xs text-text-muted">{machine.type}</span>
              <span className="text-text-dim">·</span>
              <span className="text-xs text-text-muted">
                Gateway IoT: <strong className="font-mono text-accent">{machine.deviceId}</strong>
              </span>
            </div>

            <h1 className="mt-2.5 text-2xl font-extrabold text-white">{machine.name}</h1>
            <p className="mt-1 text-sm font-medium text-text-secondary">
              {company?.name} · <span className="text-text-muted">{unit?.name} ({sector?.name || "Setor de Usinagem"})</span>
            </p>
          </div>

          {/* Right Status Panel */}
          <div className="flex flex-col lg:items-end">
            <StatusBadge status={machine.status} size="md" isNew={machine.isNew} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {getStateDurationLabel(machine.status)}
            </p>
            <p className={`data-mono text-3xl font-extrabold ${isRunning ? "text-accent" : cfg.text}`}>
              {disconnected ? formatRelativeTime(machine.lastCommunicationAt).replace("há ", "") : stateDuration.formatted}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              {disconnected ? (
                <span className="inline-flex items-center gap-1 text-slate-400 font-medium">
                  <WifiOff size={13} /> Gateway Offline
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-accent font-medium">
                  <Wifi size={13} /> Telemetria Online
                </span>
              )}
              <span>·</span>
              <span>Último sync {formatRelativeTime(machine.lastCommunicationAt)}</span>
            </div>
          </div>
        </div>

        {/* Quick action buttons */}
        <div className="mt-6 flex flex-wrap gap-2.5 border-t border-base-border/70 pt-4">
          <div className="flex flex-wrap gap-2.5">
            <a href="#telemetria-comparativa" className="btn-secondary !py-1.5 !px-3 text-xs">
              <Zap size={14} className="text-accent" /> Telemetria Comparativa
            </a>
            <a href="#ocorrencias" className="btn-secondary !py-1.5 !px-3 text-xs">
              <History size={14} className="text-accent" /> Histórico de Telemetria
            </a>
            <Link to={`/dispositivos?dispositivo=${machine.deviceId}`} className="btn-secondary !py-1.5 !px-3 text-xs">
              <Cpu size={14} className="text-accent" /> Módulo Arduino Opta WiFi
            </Link>
          </div>
        </div>
      </header>

      {/* Problem Alert Banner if critical */}
      <MachineIncidents key={machine.backendId || machine.id} machine={machine} />
      {problem && (
        <section className={`panel p-5 border-l-4 ${cfg.border} bg-rose-500/[0.04]`}>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-rose-400">
            <AlertTriangle size={16} /> Resumo do Evento Crítico
          </div>
          <h2 className="mt-2 text-base font-bold text-text-primary">
            {machine.id} ({machine.name}) está em estado de {cfg.label.toLowerCase()}.
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-base-border bg-base-surface/80 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Início</span>
              <p className="data-mono mt-1 text-sm font-bold text-text-primary">
                {new Date(machine.stateSince).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </p>
            </div>
            <div className="rounded-lg border border-base-border bg-base-surface/80 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Tempo no Estado</span>
              <p className={`data-mono mt-1 text-sm font-bold ${cfg.text}`}>{stateDuration.formatted}</p>
            </div>
            <div className="rounded-lg border border-base-border bg-base-surface/80 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Estado Anterior</span>
              <p className="mt-1 text-sm font-bold text-text-primary">{getStatusConfig(machine.lastKnownStatus).label}</p>
            </div>
            <div className="rounded-lg border border-base-border bg-base-surface/80 p-3">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">Status do Gateway</span>
              <p className={`mt-1 text-sm font-bold ${disconnected ? "text-slate-400" : "text-accent"}`}>
                {disconnected ? "Offline" : "Online"}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Unusual Zero Consumption Banner (Informative) */}
      {telemetrySummary?.power?.isUnusual && isRunning && (
        <div className="panel border-l-4 border-amber-500/80 bg-amber-500/[0.06] p-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
            <AlertTriangle size={15} /> Situação Incomum Detectada
          </div>
          <p className="mt-1 text-xs text-text-primary">
            A máquina <strong className="font-mono text-amber-400">{machine.id}</strong> está registrada em estado <strong>OPERANDO</strong>, porém a potência ativa registrada é de <strong>0.0 kW</strong>.
          </p>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* 18 & 19 & 20 & 21: REAL-TIME TELEMETRY COMPARISON SECTION     */}
      {/* ------------------------------------------------------------- */}
      <section id="telemetria-comparativa" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-text-primary">
                Comparação e Tendências em Tempo Real
              </h2>
              <span className="rounded bg-accent/10 px-2 py-0.5 font-mono text-[10px] font-bold text-accent border border-accent/20">
                HISTÓRICO DA CNC
              </span>
            </div>
            <p className="text-xs text-text-muted">
              Leituras recebidas e limites de referência da interface. Médias ausentes aparecem como indisponíveis.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Card: Corrente */}
          <div className="panel p-4 bg-base-surface/80 border-base-border hover:border-accent/40 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Zap size={13} className="text-accent" /> Corrente de Linha
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${telemetrySummary?.current?.badgeBg}`}>
                {telemetrySummary?.current?.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-text-dim block">Atual</span>
                <span className={`data-mono text-2xl font-extrabold ${telemetrySummary?.current?.isAbnormal ? "text-amber-400" : "text-accent"}`}>
                  {machine.current !== null ? `${machine.current} A` : "—"}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-text-dim block">Variação vs Média</span>
                <span className={`data-mono text-xs font-bold inline-flex items-center gap-0.5 ${Number(curDiff) > 0 ? "text-amber-400" : "text-accent"}`}>
                  {curTrend === "UP" ? <TrendingUp size={12} /> : curTrend === "DOWN" ? <TrendingDown size={12} /> : <Minus size={12} />}
                  {curAvg == null ? "—" : Number(curDiff) > 0 ? `+${curDiff}%` : `${curDiff}%`}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-base-border/70 pt-2.5 text-xs">
              <div className="flex justify-between text-text-muted text-[11px]">
                <span>Média recente (5 min):</span>
                <strong className="data-mono text-text-primary">{curAvg == null ? "—" : `${curAvg} A`}</strong>
              </div>
              <div className="flex justify-between text-text-muted text-[11px]">
                <span>Faixa normal:</span>
                <strong className="data-mono text-accent font-semibold">{machine.currentNormalRange?.[0] || 10} – {machine.currentNormalRange?.[1] || 22} A</strong>
              </div>
            </div>
          </div>

          {/* Card: Temperatura */}
          <div className="panel p-4 bg-base-surface/80 border-base-border hover:border-accent/40 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Thermometer size={13} className="text-accent" /> Temperatura do Fusil
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${telemetrySummary?.temperature?.badgeBg}`}>
                {telemetrySummary?.temperature?.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-text-dim block">Atual</span>
                <span className={`data-mono text-2xl font-extrabold ${telemetrySummary?.temperature?.isAbnormal ? "text-rose-400" : "text-text-primary"}`}>
                  {machine.temperature !== null ? `${machine.temperature} °C` : "—"}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-text-dim block">Variação vs Média</span>
                <span className={`data-mono text-xs font-bold inline-flex items-center gap-0.5 ${Number(tempDiff) > 0 ? "text-rose-400" : "text-accent"}`}>
                  {tempTrend === "UP" ? <TrendingUp size={12} /> : tempTrend === "DOWN" ? <TrendingDown size={12} /> : <Minus size={12} />}
                  {tempAvg == null ? "—" : Number(tempDiff) > 0 ? `+${tempDiff}%` : `${tempDiff}%`}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-base-border/70 pt-2.5 text-xs">
              <div className="flex justify-between text-text-muted text-[11px]">
                <span>Média recente (5 min):</span>
                <strong className="data-mono text-text-primary">{tempAvg == null ? "—" : `${tempAvg} °C`}</strong>
              </div>
              <div className="flex justify-between text-text-muted text-[11px]">
                <span>Faixa normal:</span>
                <strong className="data-mono text-accent font-semibold">{machine.temperatureNormalRange?.[0] || 20} – {machine.temperatureNormalRange?.[1] || 65} °C</strong>
              </div>
            </div>
          </div>

          {/* Card: Potência / Consumo */}
          <div className="panel p-4 bg-base-surface/80 border-base-border hover:border-accent/40 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Activity size={13} className="text-accent" /> Potência / Consumo
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${telemetrySummary?.power?.badgeBg}`}>
                {telemetrySummary?.power?.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-text-dim block">Atual</span>
                <span className="data-mono text-2xl font-extrabold text-text-primary">
                  {machine.powerKw !== null ? `${machine.powerKw} kW` : "—"}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-text-dim block">Variação vs Média</span>
                <span className="data-mono text-xs font-bold text-accent">
                  {powerAvg == null ? "—" : Number(powerDiff) > 0 ? `+${powerDiff}%` : `${powerDiff}%`}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-base-border/70 pt-2.5 text-xs">
              <div className="flex justify-between text-text-muted text-[11px]">
                <span>Média recente:</span>
                <strong className="data-mono text-text-primary">{powerAvg == null ? "—" : `${powerAvg} kW`}</strong>
              </div>
              <div className="flex justify-between text-text-muted text-[11px]">
                <span>Status de consumo:</span>
                <strong className="text-accent">{telemetrySummary?.power?.isUnusual ? "Incomum" : "Nominal"}</strong>
              </div>
            </div>
          </div>

          {/* Card: Tensão Trifásica */}
          <div className="panel p-4 bg-base-surface/80 border-base-border hover:border-accent/40 transition-all space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Gauge size={13} className="text-accent" /> Tensão Trifásica
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${telemetrySummary?.voltage?.badgeBg}`}>
                {telemetrySummary?.voltage?.label}
              </span>
            </div>

            <div className="flex items-baseline justify-between">
              <div>
                <span className="text-[10px] text-text-dim block">Atual</span>
                <span className="data-mono text-2xl font-extrabold text-white">
                  {machine.voltage !== null ? `${machine.voltage} V` : "—"}
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-text-dim block">Faixa Nominal</span>
                <span className="data-mono text-xs font-bold text-accent">210 – 230 V</span>
              </div>
            </div>

            <div className="space-y-1.5 border-t border-base-border/70 pt-2.5 text-xs">
              <div className="flex justify-between text-text-muted text-[11px]">
                <span>Frequência da rede:</span>
                <strong className="data-mono text-text-primary">{demoMode ? "60.0 Hz" : "Não informado"}</strong>
              </div>
              <div className="flex justify-between text-text-muted text-[11px]">
                <span>Estabilidade de fase:</span>
                <strong className="text-accent">{demoMode ? "99.8% Nominal" : "Não informado"}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* 22: REALTIME SENSOR TELEMETRY CHARTS (RECHARTS)               */}
      {/* ------------------------------------------------------------- */}
      <TelemetryChart key={machine.id} machine={machine} />

      {/* Operational Summary (Today) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-text-primary">Métricas Operacionais Consolidadas (Hoje)</h2>
            <p className="text-xs text-text-muted">Distribuição temporal do turno atual de trabalho.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <MetricGauge
            label="Operando"
            value={machine.operatingTimeToday == null ? "—" : formatDuration(machine.operatingTimeToday)}
            tone="text-accent"
            icon={Activity}
            progress={availability}
            subtitle={demoMode ? `${availability}% do tempo` : "Sem consolidação diária"}
          />
          <MetricGauge
            label="Parada"
            value={machine.stoppedTimeToday == null ? "—" : formatDuration(machine.stoppedTimeToday)}
            tone="text-slate-300"
            icon={Clock}
          />
          <MetricGauge
            label="Alarme"
            value={machine.alarmTimeToday == null ? "—" : formatDuration(machine.alarmTimeToday)}
            tone="text-amber-400"
            icon={AlertTriangle}
          />
          <MetricGauge
            label="Emergência"
            value={machine.emergencyTimeToday == null ? "—" : formatDuration(machine.emergencyTimeToday)}
            tone="text-rose-400"
            icon={Radio}
          />
          <MetricGauge
            label="Disponibilidade"
            value={demoMode ? `${availability}%` : "—"}
            tone="text-accent font-extrabold"
            progress={availability}
            subtitle="OEE Disponibilidade"
          />
        </div>
      </section>

      {/* Realtime Operating Gantt Timeline */}
      {demoMode ? <OperatingTimeline machine={machine} /> : <p className="panel p-4 text-sm text-text-muted">Indicadores diários e linha do tempo aguardam cálculo sobre o histórico completo.</p>}

      {/* Digital PLC / I/O Signals & Hardware Info */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Digital PLC / I/O Signals */}
        <section className="panel p-5 space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-base-border/70 pb-3">
            <div className="flex items-center gap-2">
              <Radio size={16} className="text-accent" />
              <h2 className="text-sm font-bold text-text-primary">Sinais Digitais e Ciclo (PLC)</h2>
            </div>
            <span className="font-mono text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded border border-accent/20">
              CICLO {machine.digitalSignals?.ciclo === true ? "EM ANDAMENTO" : machine.digitalSignals?.ciclo === false ? "INATIVO" : "NÃO INFORMADO"}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(machine.digitalSignals || {}).map(([key, active]) => (
              <div key={key} className="flex items-center justify-between rounded-lg border border-base-border bg-base-card/60 p-3">
                <div className="flex items-center gap-2.5">
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition-all ${
                      active ? "bg-accent shadow-[0_0_8px_#10B981]" : "bg-slate-700"
                    }`}
                  />
                  <span className="text-xs font-semibold text-text-primary capitalize">{key}</span>
                </div>
                <span
                  className={`font-mono text-xs font-bold ${
                    active ? "text-accent" : "text-text-dim"
                  }`}
                >
                  {active ? "ATIVO" : "INATIVO"}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-base-border/70 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
              Transdutores e Sensores Conectados
            </p>
            <div className="flex flex-wrap gap-2">
              {machine.sensors.map((sensor) => (
                <span
                  key={sensor}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-accent/20 bg-accent/5 px-2.5 py-1 text-xs font-medium text-text-primary"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_4px_#10B981]" />
                  {sensor}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Gateway Device Info */}
        <section className="panel p-5 space-y-3">
          <div className="flex items-center justify-between border-b border-base-border/70 pb-3">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-accent" />
              <h2 className="text-sm font-bold text-text-primary">Módulo Arduino Opta WiFi Associado</h2>
            </div>
          </div>

          <div className="space-y-1">
            <DetailRow label="ID do Dispositivo" value={machine.deviceId} mono />
            <DetailRow label="Versão Firmware" value={machine.firmwareVersion} mono />
            <DetailRow
              label="Intensidade Wi-Fi (RSSI)"
              value={
                <span className="inline-flex items-center gap-1.5 text-accent">
                  <Signal size={13} /> {machine.rssi == null ? "Não informado" : `${machine.rssi} dBm`}
                </span>
              }
              mono
            />
            <DetailRow label="Uptime Gateway" value={machine.uptimeSeconds == null ? "Não informado" : formatDuration(machine.uptimeSeconds)} mono />
            <DetailRow
              label="Comunicação"
              value={
                <span className={disconnected ? "text-slate-400 font-bold" : "text-accent font-bold"}>
                  {disconnected ? "Offline" : "Online"}
                </span>
              }
            />
          </div>

        </section>
      </div>

      {/* Machine Occurrences / History Section */}
      <section id="ocorrencias" className="panel p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-base-border/70 pb-3">
          <div className="flex items-center gap-2">
            <History size={16} className="text-accent" />
            <h2 className="text-sm font-bold text-text-primary">Histórico de Eventos de Telemetria da CNC</h2>
          </div>
          <span className="font-mono text-[10px] text-text-muted">{machineEvents.length} eventos</span>
        </div>

        {machineEvents.length === 0 ? (
          <p className="text-xs text-text-muted py-4">Nenhum evento de telemetria registrado para esta máquina nesta sessão.</p>
        ) : (
          <div className="divide-y divide-base-border/70 max-h-72 overflow-y-auto">
            {machineEvents.map((event) => (
              <div key={event.id} className="flex flex-col sm:flex-row sm:items-center justify-between py-3 gap-2 pr-2">
                <div className="flex items-center gap-2.5">
                  <span className="data-mono text-xs font-semibold text-text-muted shrink-0">{event.time}</span>
                  <span className="text-xs font-semibold text-text-primary">{event.text}</span>
                  {event.detail && (
                    <span className="text-[11px] text-text-muted">({event.detail})</span>
                  )}
                </div>
                {event.status && <StatusBadge status={event.status} size="sm" />}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

