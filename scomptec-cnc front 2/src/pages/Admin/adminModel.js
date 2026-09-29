export const roles = { admin: "Administrador", maintenance: "Manutenção", operator: "Operador", viewer: "Visualizador" };
export const demoMachines = [
  { id: "DEMO-CNC-01", name: "Centro de usinagem 01", status: "OPERANDO", current: 14.2, voltage: 220, temperature: 42, powerKw: 3.1, digitalSignals: { ciclo: true, alarme: false, emergencia: false }, communicationStatus: "ONLINE" },
  { id: "DEMO-CNC-02", name: "Torno CNC 02", status: "ALARME", current: 25.4, voltage: 218, temperature: 73, powerKw: 5.5, digitalSignals: { ciclo: false, alarme: true, emergencia: false }, communicationStatus: "ONLINE" },
  { id: "DEMO-CNC-03", name: "Fresadora 03", status: "EMERGENCIA", current: 0, voltage: 220, temperature: 38, powerKw: 0, digitalSignals: { ciclo: false, alarme: true, emergencia: true }, communicationStatus: "ONLINE" },
  { id: "DEMO-CNC-04", name: "Centro de usinagem 04", status: "SEM_COMUNICACAO", current: null, voltage: null, temperature: null, powerKw: null, digitalSignals: {}, communicationStatus: "OFFLINE" },
];
export const defaultRules = { current: 22, temperature: 65, voltageMin: 200, voltageMax: 240 };
export function signalProblems(machine, rules) {
  if (machine.communicationStatus === "OFFLINE" || machine.status === "SEM_COMUNICACAO") return ["Sem comunicação"];
  const problems = [];
  if (machine.status === "EMERGENCIA" || machine.digitalSignals?.emergencia) problems.push("Emergência acionada");
  if (machine.status === "ALARME" || machine.digitalSignals?.alarme) problems.push("Alarme da CNC");
  if (machine.current != null && machine.current > rules.current) problems.push("Corrente elevada");
  if (machine.temperature != null && machine.temperature > rules.temperature) problems.push("Temperatura elevada");
  if (machine.voltage != null && (machine.voltage < rules.voltageMin || machine.voltage > rules.voltageMax)) problems.push("Tensão fora da faixa");
  if (["RECONNECTING", "DADOS_DESATUALIZADOS"].includes(machine.status)) problems.push("Dados desatualizados");
  return problems;
}

export function initialAdminState(demo) {
  return { users: [], rules: { ...defaultRules }, audit: [], incidents: demo ? [
    { id: "OC-DEMO-01", machineId: "DEMO-CNC-02", title: "Temperatura elevada no torno", priority: "Alta", status: "Aberta", assignee: "", note: "Verificar refrigeração e condição do sensor.", createdAt: new Date().toISOString() },
    { id: "OC-DEMO-02", machineId: "DEMO-CNC-03", title: "Verificar emergência acionada", priority: "Crítica", status: "Aberta", assignee: "", note: "Inspecionar o local antes de qualquer liberação operacional.", createdAt: new Date().toISOString() },
  ] : [] };
}
