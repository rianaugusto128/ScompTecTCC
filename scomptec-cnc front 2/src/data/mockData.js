// Estado vazio inicial. Os dados operacionais passam a vir do FastAPI.
export const currentUser = { id: null, name: "Operador", role: null, email: "" };
export const companies = [];
export const units = [];
export const sectors = [];
export const machines = [];
export const alerts = [];
export const recentEvents = [];
export const historyLog = [];
export const devices = [];
export const utilizationSeries = [];

export function getDashboardSummary(machineList = machines) {
  return { total: machineList.length, operating: 0, stopped: 0, alarmsAndEmergencies: 0 };
}
