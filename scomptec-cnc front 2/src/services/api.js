// Camada de acesso à API REST (FastAPI), configurada pelo .env do frontend.
import {
  machines,
  alerts,
  companies,
  units,
  sectors,
  devices,
  historyLog,
  recentEvents,
  utilizationSeries,
  getDashboardSummary,
} from "../data/mockData";
import { readingEvent, readAnalog, buildTelemetryBuffer } from "./telemetry";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL?.trim() || "http://127.0.0.1:8000/api").replace(/\/+$/, "");
const SIMULATED_DELAY = 250;
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === "true";

function friendlyApiMessage(message) {
  if (!message) return "Não foi possível completar a solicitação.";
  const lower = message.toLowerCase();
  if (lower.includes("valid email") || lower.includes("email address") || lower.includes("@-sign")) {
    return "Digite um e-mail válido, por exemplo nome@empresa.com.br.";
  }
  if (lower.includes("string should have at least 8 characters") || lower.includes("at least 8")) {
    return "A senha precisa ter pelo menos 8 caracteres.";
  }
  if (lower.includes("string should have at least 2 characters") || lower.includes("at least 2")) {
    return "O nome precisa ter pelo menos 2 caracteres.";
  }
  return message;
}

function mockResponse(data) {
  return new Promise((resolve) => setTimeout(() => resolve(data), SIMULATED_DELAY));
}

async function request(path, options = {}) {
  const token = localStorage.getItem("scomptec_access_token");
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    signal: options.signal || AbortSignal.timeout(10000),
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  if (!response.ok) {
    let message = "Não foi possível completar a solicitação.";
    try {
      const payload = await response.json();
      if (typeof payload.detail === "string") {
        message = payload.detail;
      } else if (Array.isArray(payload.detail) && payload.detail.length) {
        message = payload.detail.map((item) => item.msg).filter(Boolean).join(" ");
      }
    } catch {
      message = `API ${response.status}`;
    }
    throw new Error(friendlyApiMessage(message || `API ${response.status}`));
  }
  return response.status === 204 ? null : response.json();
}


async function toFrontendMachine(cnc, devices) {
  const [status, history, utilization] = await Promise.all([
    request(`/cncs/${cnc.id}/status`), request(`/cncs/${cnc.id}/history?limit=100`),
    request(`/cncs/${cnc.id}/utilization`),
  ]);
  const device = devices.find(item => item.cnc_id === cnc.id);
  const analog = status.analog_signals || {};
  return {
    id: cnc.code,
    backendId: cnc.id,
    deviceId: device?.code,
    deviceBackendId: device?.id,
    firmwareVersion: device?.firmware_version,
    ipAddress: device?.ip_address,
    macAddress: device?.mac_address,
    rssi: status.extra_signals?.rssi ?? null,
    uptimeSeconds: status.extra_signals?.uptime_seconds ?? null,
    name: cnc.name,
    description: cnc.description,
    status: status.status,
    state: status.status,
    lastKnownStatus: status.last_known_status,
    stateSince: status.status_since,
    lastCommunicationAt: status.last_seen,
    communicationStatus: status.gateway_online ? "ONLINE" : "OFFLINE",
    current: readAnalog(analog, "current", "corrente"),
    voltage: readAnalog(analog, "voltage", "tensao"),
    temperature: readAnalog(analog, "temperature", "temperatura"),
    powerKw: readAnalog(analog, "power_kw", "powerKw", "potencia_kw"),
    digitalSignals: status.digital_signals || {},
    voltage24v: status.voltage_24v,
    mesa: status.extra_signals?.mesa ?? null,
    telemetryBootId: status.extra_signals?.boot_id ?? null,
    currentLimit: 22,
    temperatureLimit: 65,
    powerAvg: 4.2,
    telemetryTimestamp: status.telemetry_timestamp,
    historyTotal: history.total,
    utilization,
    readings: history.items,
    sensors: [...Object.keys(status.digital_signals || {}), ...Object.keys(analog)],
    telemetryBuffer: buildTelemetryBuffer(history.items),
  };
}

export const api = {
  getMachineIncidents: (id) => request(`/cncs/${encodeURIComponent(id)}/incidents`),
  me: () => request("/auth/me"),
  getAdminState: () => request("/admin/state"),
  deleteAdminUser: (id) => request(`/admin/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  createAdminUser: (payload) => request("/admin/users", { method: "POST", body: JSON.stringify(payload) }),
  updateAdminUser: (id, payload) => request(`/admin/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  createIncident: (payload) => request("/admin/incidents", { method: "POST", body: JSON.stringify(payload) }),
  updateIncident: (id, payload) => request(`/admin/incidents/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(payload) }),
  saveAdminRules: (payload) => request("/admin/rules", { method: "PUT", body: JSON.stringify(payload) }),
  // --- Autenticação ---
  async login(email, password) {
    if (USE_MOCKS) return mockResponse({ token: "mock-token", email });
    const session = await request("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) });
    localStorage.setItem("scomptec_access_token", session.access_token);
    localStorage.setItem("scomptec_user", JSON.stringify(session.user));
    return session;
  },
  async register(payload) {
    if (USE_MOCKS) return mockResponse({ success: true, ...payload });
    const session = await request("/auth/register", {
      method: "POST",
      body: JSON.stringify({ ...payload, name: payload.name.trim(), email: payload.email.trim() }),
    });
    localStorage.setItem("scomptec_access_token", session.access_token);
    localStorage.setItem("scomptec_user", JSON.stringify(session.user));
    return session;
  },

  // --- Empresas / Unidades ---
  async getCompanies() {
    return mockResponse(USE_MOCKS ? companies : []);
  },
  async getUnits(companyId) {
    return mockResponse(USE_MOCKS ? units.filter((u) => u.companyId === companyId) : []);
  },
  async getSectors(unitId) {
    return mockResponse(USE_MOCKS ? sectors.filter((s) => s.unitId === unitId) : []);
  },

  // --- Máquinas ---
  async getMachines() {
    if (USE_MOCKS) return mockResponse(machines);
    const [cncs, registeredDevices] = await Promise.all([request("/cncs"), request("/devices")]);
    return Promise.all(cncs.map(cnc => toFrontendMachine(cnc, registeredDevices)));
  },
  async getMachineById(id) {
    if (USE_MOCKS) return mockResponse(machines.find((m) => m.id === id) || null);
    const machines = await this.getMachines();
    return machines.find((machine) => machine.id === id || machine.backendId === id) || null;
  },
  async getDashboardSummary() {
    return getDashboardSummary(await this.getMachines());
  },
  async getUtilizationSeries() {
    return mockResponse(USE_MOCKS ? utilizationSeries : []);
  },

  // --- Alertas ---
  async getAlerts() {
    if (USE_MOCKS) return mockResponse(alerts);
    return (await this.getMachines()).filter(machine => ["ALARME", "EMERGENCIA", "SEM_COMUNICACAO", "DADOS_DESATUALIZADOS"].includes(machine.status)).map(machine => ({id: machine.id, machineId: machine.id, machineName: machine.name, severity: machine.status, occurredAt: machine.stateSince}));
  },

  // --- Histórico / Eventos ---
  async getHistory() {
    if (USE_MOCKS) return mockResponse(historyLog);
    return (await this.getMachines()).flatMap(machine => machine.readings.map(reading => readingEvent(reading, machine))).sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
  },
  async getRecentEvents() {
    return USE_MOCKS ? mockResponse(recentEvents) : this.getHistory();
  },

  // --- Dispositivos ---
  async getDevices() {
    if (USE_MOCKS) return mockResponse(devices);
    return request("/devices");
  },
};

export default api;



