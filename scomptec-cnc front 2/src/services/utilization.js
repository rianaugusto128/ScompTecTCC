export const UTILIZATION_STATES = [
  { key: "OPERANDO", label: "Operando", color: "#10B981" },
  { key: "PARADA", label: "Parada", color: "#94A3B8" },
  { key: "ALARME", label: "Alarme", color: "#F59E0B" },
  { key: "EMERGENCIA", label: "Emergência", color: "#EF4444" },
  { key: "MANUTENCAO", label: "Manutenção", color: "#A78BFA" },
  { key: "DESLIGADA", label: "Desligada", color: "#475569" },
];

export function summarizeUtilization(machines = [], hours = 24, demoData) {
  const totals = Object.fromEntries(UTILIZATION_STATES.map(state => [state.key, 0]));
  let capacity = 0;
  let samples = 0;
  const source = demoData ? demoData.slice(-hours).map(item => ({
    hour: item.hour,
    seconds: Object.fromEntries(UTILIZATION_STATES.map(state => [state.key, (item[state.label] || 0) * 3600])),
  })) : Array.from({ length: hours }, (_, index) => {
    const seconds = Object.fromEntries(UTILIZATION_STATES.map(state => [state.key, 0]));
    let timestamp;
    for (const machine of machines) {
      const bucket = machine.utilization?.buckets?.slice(-hours)[index];
      if (!bucket) continue;
      timestamp ??= bucket.timestamp;
      samples += bucket.samples;
      capacity += bucket.duration_seconds;
      for (const state of UTILIZATION_STATES) seconds[state.key] += bucket.seconds[state.key] || 0;
    }
    return { timestamp, seconds };
  });
  const data = source.map((bucket, index) => {
    const observed = Object.values(bucket.seconds).reduce((sum, value) => sum + value, 0);
    for (const state of UTILIZATION_STATES) totals[state.key] += bucket.seconds[state.key];
    return {
      ageHours: source.length - index - 1,
      timestamp: bucket.timestamp,
      hour: bucket.hour || (bucket.timestamp ? new Date(bucket.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "—"),
      observed,
      alertRate: observed ? (bucket.seconds.ALARME + bucket.seconds.EMERGENCIA) / observed * 100 : null,
      ...Object.fromEntries(UTILIZATION_STATES.map(state => [state.key, observed ? bucket.seconds[state.key] / observed * 100 : null])),
    };
  });
  const observed = Object.values(totals).reduce((sum, value) => sum + value, 0);
  if (demoData) capacity = observed;
  return { data, totals, observed, samples, capacity,
    alertRate: observed ? (totals.ALARME + totals.EMERGENCIA) / observed * 100 : null,
    peakAlertRate: observed ? Math.max(...data.map(point => point.alertRate ?? 0)) : null,
    utilization: observed ? totals.OPERANDO / observed * 100 : null,
    coverage: capacity ? observed / capacity * 100 : 0,
  };
}
