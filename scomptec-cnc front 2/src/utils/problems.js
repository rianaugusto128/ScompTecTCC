import { MACHINE_STATUS } from "./status";

export const ACTIVE_PROBLEM_STATUSES = new Set([
  MACHINE_STATUS.EMERGENCIA,
  MACHINE_STATUS.ALARME,
  MACHINE_STATUS.SEM_COMUNICACAO,
  MACHINE_STATUS.DADOS_DESATUALIZADOS,
  MACHINE_STATUS.PARADA,
]);

export function isActiveProblem(status) {
  return ACTIVE_PROBLEM_STATUSES.has(status);
}

export function getProblemPriority(problem, now = Date.now()) {
  const startedAt = problem.occurredAt || problem.stateSince || now;
  const durationMinutes = Math.max(0, (now - new Date(startedAt).getTime()) / 60000);
  if (problem.severity === MACHINE_STATUS.EMERGENCIA) return 1;
  if (problem.severity === MACHINE_STATUS.ALARME && problem.critical) return 2;
  if ([MACHINE_STATUS.SEM_COMUNICACAO, MACHINE_STATUS.DADOS_DESATUALIZADOS].includes(problem.severity)) return 3;
  if (problem.severity === MACHINE_STATUS.PARADA && durationMinutes >= 60) return 4;
  if (problem.severity === MACHINE_STATUS.ALARME) return 5;
  if (problem.severity === MACHINE_STATUS.PARADA) return 6;
  return 99;
}

export function sortActiveProblems(problems, now = Date.now()) {
  return [...problems].sort((a, b) => {
    const priority = getProblemPriority(a, now) - getProblemPriority(b, now);
    if (priority !== 0) return priority;
    const durationA = now - new Date(a.occurredAt || a.stateSince || now).getTime();
    const durationB = now - new Date(b.occurredAt || b.stateSince || now).getTime();
    if (durationA !== durationB) return durationB - durationA;
    return new Date(b.occurredAt || 0).getTime() - new Date(a.occurredAt || 0).getTime();
  });
}
