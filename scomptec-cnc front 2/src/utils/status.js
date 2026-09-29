// Configuração central dos estados de máquina e telemetria industrial.
// Qualquer tela que precise exibir status deve consumir este arquivo,
// garantindo consistência visual em todo o sistema.
import {
  Play,
  Pause,
  AlertTriangle,
  Siren,
  Power,
  WifiOff,
  RefreshCw,
  TriangleAlert,
  Wrench,
  Zap,
  Thermometer,
  Gauge,
  Activity,
} from "lucide-react";

export const MACHINE_STATUS = {
  OPERANDO: "OPERANDO",
  PARADA: "PARADA",
  ALARME: "ALARME",
  EMERGENCIA: "EMERGENCIA",
  MANUTENCAO: "MANUTENCAO",
  DESLIGADA: "DESLIGADA",
  SEM_COMUNICACAO: "SEM_COMUNICACAO",
  RECONNECTING: "RECONNECTING",
  DADOS_DESATUALIZADOS: "DADOS_DESATUALIZADOS",
};

export const STATUS_CONFIG = {
  [MACHINE_STATUS.OPERANDO]: {
    label: "Operando",
    dot: "bg-accent shadow-[0_0_8px_#10B981]",
    text: "text-accent",
    bg: "bg-accent-soft",
    border: "border-accent/30",
    glow: "shadow-[0_0_15px_rgba(16,185,129,0.15)]",
    icon: Play,
    pulse: true,
  },
  [MACHINE_STATUS.PARADA]: {
    label: "Parada",
    dot: "bg-amber-400/80 shadow-[0_0_6px_rgba(251,191,36,0.4)]",
    text: "text-amber-400",
    bg: "bg-amber-400/10",
    border: "border-amber-400/20",
    glow: "",
    icon: Pause,
    pulse: false,
  },
  [MACHINE_STATUS.ALARME]: {
    label: "Alarme",
    dot: "bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.5)]",
    text: "text-orange-400",
    bg: "bg-orange-500/10",
    border: "border-orange-500/25",
    glow: "shadow-[0_0_15px_rgba(249,115,22,0.12)]",
    icon: AlertTriangle,
    pulse: true,
  },
  [MACHINE_STATUS.EMERGENCIA]: {
    label: "Emergência",
    dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]",
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.18)]",
    icon: Siren,
    pulse: true,
  },
  [MACHINE_STATUS.MANUTENCAO]: {
    label: "Manutenção",
    dot: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
    text: "text-sky-400",
    bg: "bg-sky-500/10",
    border: "border-sky-500/25",
    glow: "shadow-[0_0_15px_rgba(56,189,248,0.15)]",
    icon: Wrench,
    pulse: false,
  },
  [MACHINE_STATUS.DESLIGADA]: {
    label: "Desligada",
    dot: "bg-slate-500",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    glow: "",
    icon: Power,
    pulse: false,
  },
  [MACHINE_STATUS.SEM_COMUNICACAO]: {
    label: "Sem comunicação",
    dot: "bg-slate-400",
    text: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    glow: "",
    icon: WifiOff,
    pulse: false,
  },
  [MACHINE_STATUS.RECONNECTING]: {
    label: "Reconectando",
    dot: "bg-emerald-400 animate-pulse",
    text: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    glow: "",
    icon: RefreshCw,
    pulse: true,
  },
  [MACHINE_STATUS.DADOS_DESATUALIZADOS]: {
    label: "Dados desatualizados",
    dot: "bg-amber-400",
    text: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    glow: "",
    icon: TriangleAlert,
    pulse: false,
  },
};

export function getStatusConfig(status) {
  return STATUS_CONFIG[status] || STATUS_CONFIG[MACHINE_STATUS.SEM_COMUNICACAO];
}

export function formatDuration(minutesTotal) {
  const h = Math.floor(minutesTotal / 60);
  const m = minutesTotal % 60;
  return h > 0 ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
}

export function getStateDurationLabel(status) {
  return {
    [MACHINE_STATUS.OPERANDO]: "Operando há",
    [MACHINE_STATUS.PARADA]: "Parada há",
    [MACHINE_STATUS.ALARME]: "Em alarme há",
    [MACHINE_STATUS.EMERGENCIA]: "Em emergência há",
    [MACHINE_STATUS.MANUTENCAO]: "Em manutenção há",
    [MACHINE_STATUS.DESLIGADA]: "Desligada há",
    [MACHINE_STATUS.SEM_COMUNICACAO]: "Sem dados há",
    [MACHINE_STATUS.RECONNECTING]: "Reconectando há",
    [MACHINE_STATUS.DADOS_DESATUALIZADOS]: "Última comunicação",
  }[status] || "Neste estado há";
}

// ----------------------------------------------------
// AVALIAÇÃO OBJETIVA DE TELEMETRIA (Fatos, sem diagnósticos)
// ----------------------------------------------------

export function evaluateCurrent(current, limit = 22, min = 10) {
  if (current === null || current === undefined) return { status: "SEM_DADOS", label: "Sem leitura", tone: "text-text-muted" };
  if (current > limit) {
    return {
      status: "ACIMA_DO_LIMITE",
      label: `Acima do limite (${limit} A)`,
      message: `Corrente (${current} A) acima do limite configurado de ${limit} A`,
      tone: "text-amber-400",
      badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      isAbnormal: true,
    };
  }
  return {
    status: "NORMAL",
    label: "Normal",
    message: `Corrente (${current} A) dentro da faixa normal (${min}-${limit} A)`,
    tone: "text-accent",
    badgeBg: "bg-accent/10 border-accent/20 text-accent",
    isAbnormal: false,
  };
}

export function evaluateTemperature(temp, limit = 65, min = 20) {
  if (temp === null || temp === undefined) return { status: "SEM_DADOS", label: "Sem leitura", tone: "text-text-muted" };
  if (temp > limit) {
    return {
      status: "ACIMA_DO_LIMITE",
      label: `Temperatura elevada (${temp} °C)`,
      message: `Temperatura de ${temp} °C acima do limite operacional de ${limit} °C`,
      tone: "text-rose-400",
      badgeBg: "bg-rose-500/15 border-rose-500/30 text-rose-400",
      isAbnormal: true,
    };
  }
  return {
    status: "NORMAL",
    label: "Normal",
    message: `Temperatura de ${temp} °C dentro da faixa operacional (${min}-${limit} °C)`,
    tone: "text-accent",
    badgeBg: "bg-accent/10 border-accent/20 text-accent",
    isAbnormal: false,
  };
}

export function evaluatePower(powerKw, machineStatus, avg = 4.2) {
  if (powerKw === null || powerKw === undefined) return { status: "SEM_DADOS", label: "Sem leitura", tone: "text-text-muted" };
  
  // Situação incomum: Máquina marcada como OPERANDO mas com consumo 0 kW
  if (machineStatus === MACHINE_STATUS.OPERANDO && powerKw <= 0.05) {
    return {
      status: "CONSUMO_ZERO_INCOMUM",
      label: "Consumo Zero Incomum",
      message: "Máquina em operação com consumo registrado de 0 kW",
      tone: "text-amber-400",
      badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      isUnusual: true,
    };
  }

  if (powerKw > avg * 1.35) {
    return {
      status: "CONSUMO_ELEVADO",
      label: "Consumo Elevado",
      message: `Consumo de ${powerKw} kW está acima da média histórica de ${avg} kW`,
      tone: "text-amber-400",
      badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      isUnusual: true,
    };
  }

  return {
    status: "NORMAL",
    label: "Normal",
    message: `Consumo de ${powerKw} kW compatível com a média de ${avg} kW`,
    tone: "text-accent",
    badgeBg: "bg-accent/10 border-accent/20 text-accent",
    isUnusual: false,
  };
}

export function evaluateVoltage(voltage, min = 210, max = 230) {
  if (voltage === null || voltage === undefined) return { status: "SEM_DADOS", label: "Sem leitura", tone: "text-text-muted" };
  if (voltage < min || voltage > max) {
    return {
      status: "FORA_DA_FAIXA",
      label: `Tensão fora da faixa (${voltage} V)`,
      message: `Tensão de ${voltage} V fora da faixa nominal (${min}–${max} V)`,
      tone: "text-amber-400",
      badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
      isAbnormal: true,
    };
  }
  return {
    status: "NORMAL",
    label: "Normal",
    message: `Tensão de ${voltage} V estabilizada`,
    tone: "text-accent",
    badgeBg: "bg-accent/10 border-accent/20 text-accent",
    isAbnormal: false,
  };
}

export function getTelemetrySummary(machine) {
  if (!machine) return null;
  const currentEval = evaluateCurrent(machine.current, machine.currentLimit || 22);
  const tempEval = evaluateTemperature(machine.temperature, machine.temperatureLimit || 65);
  const powerEval = evaluatePower(machine.powerKw, machine.status, machine.powerAvg || 4.2);
  const voltEval = evaluateVoltage(machine.voltage, machine.voltageMin || 210, machine.voltageMax || 230);

  const hasTelemetryAbnormality = currentEval.isAbnormal || tempEval.isAbnormal || voltEval.isAbnormal;
  const hasUnusualSituation = powerEval.isUnusual;

  return {
    current: currentEval,
    temperature: tempEval,
    power: powerEval,
    voltage: voltEval,
    hasTelemetryAbnormality,
    hasUnusualSituation,
    statusText: hasTelemetryAbnormality
      ? "Telemetria fora do padrão"
      : hasUnusualSituation
      ? "Situação incomum"
      : "Telemetria nominal",
  };
}

