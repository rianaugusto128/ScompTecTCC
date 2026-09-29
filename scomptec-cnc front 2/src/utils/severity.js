import { MACHINE_STATUS } from "./status";

export const CONTEXT_SEVERITY = Object.freeze({ NORMAL: "NORMAL", ATTENTION: "ATENÇÃO", CRITICAL: "CRÍTICO" });

export const SEVERITY_CONFIG = {
  [CONTEXT_SEVERITY.NORMAL]: { label: "Normal", dot: "bg-accent shadow-[0_0_8px_#10B981]", text: "text-accent", bg: "bg-accent-soft", border: "border-accent/30" },
  [CONTEXT_SEVERITY.ATTENTION]: { label: "Atenção", dot: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]", text: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/25" },
  [CONTEXT_SEVERITY.CRITICAL]: { label: "Crítico", dot: "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.6)]", text: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
};

// Aceita uma lista de máquinas ou um resumo agregado vindo da futura API.
export function getContextSeverity(context = []) {
  const statuses = Array.isArray(context) ? context.map((item) => item.status) : [];
  const hasEmergency = statuses.includes(MACHINE_STATUS.EMERGENCIA) || Number(context.emergencies || context.emergency) > 0;
  if (hasEmergency) return CONTEXT_SEVERITY.CRITICAL;
  const needsAttention = statuses.some((status) => [MACHINE_STATUS.ALARME, MACHINE_STATUS.PARADA, MACHINE_STATUS.SEM_COMUNICACAO, MACHINE_STATUS.RECONNECTING, MACHINE_STATUS.DADOS_DESATUALIZADOS].includes(status))
    || Number(context.alarms) > 0 || Number(context.stopped) > 0 || Number(context.offline) > 0;
  return needsAttention ? CONTEXT_SEVERITY.ATTENTION : CONTEXT_SEVERITY.NORMAL;
}

export function getSeverityConfig(context) {
  return SEVERITY_CONFIG[getContextSeverity(context)];
}

const STATUS_METRIC = {
  [MACHINE_STATUS.OPERANDO]: "machinesOperating",
  [MACHINE_STATUS.PARADA]: "machinesStopped",
  [MACHINE_STATUS.ALARME]: "alarms",
  [MACHINE_STATUS.EMERGENCIA]: "emergencies",
  [MACHINE_STATUS.SEM_COMUNICACAO]: "offline",
  [MACHINE_STATUS.RECONNECTING]: "offline",
  [MACHINE_STATUS.DADOS_DESATUALIZADOS]: "offline",
};

// Mantém os totais agregados do mock/API e aplica os deltas das máquinas
// que receberam eventos em tempo real no frontend.
export function getContextStats(context, currentMachines = [], baselineMachines = []) {
  const stats = {
    machines: context.machines || currentMachines.length,
    machinesOperating: context.machinesOperating || 0,
    machinesStopped: context.machinesStopped || 0,
    alarms: context.alarms || 0,
    emergencies: context.emergencies || 0,
    offline: context.offline || 0,
  };

  currentMachines.forEach((machine) => {
    const baseline = baselineMachines.find((item) => item.id === machine.id);
    if (!baseline || baseline.status === machine.status) return;
    const previousMetric = STATUS_METRIC[baseline.status];
    const currentMetric = STATUS_METRIC[machine.status];
    if (previousMetric) stats[previousMetric] = Math.max(0, stats[previousMetric] - 1);
    if (currentMetric) stats[currentMetric] += 1;
  });

  return stats;
}
