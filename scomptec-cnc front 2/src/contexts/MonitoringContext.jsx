import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  companies,
  machines as mockMachines,
  alerts as mockAlerts,
  recentEvents as mockEvents,
  historyLog as mockHistory,
  units,
  sectors,
} from "../data/mockData";
import { monitoringEvents } from "../services/eventBus";
import api, { USE_MOCKS } from "../services/api";
import { readingEvent, markStale, startPolling } from "../services/telemetry";
import { getStatusConfig, MACHINE_STATUS, evaluateCurrent, evaluateTemperature, evaluatePower } from "../utils/status";
import { isActiveProblem, sortActiveProblems } from "../utils/problems";

export const SCOPE_TYPES = Object.freeze({
  GLOBAL: "global",
  CLIENT: "client",
  UNIT: "unit",
});

const MonitoringContext = createContext(null);

const nowMinusMinutes = (minutes) => new Date(Date.now() - minutes * 60000).toISOString();
const nowMinusSeconds = (seconds) => new Date(Date.now() - seconds * 1000).toISOString();

function generateInitialTelemetryBuffer(baseMachine) {
  const current = baseMachine.current ?? 12.0;
  const voltage = baseMachine.voltage ?? 220;
  const temp = baseMachine.temperature ?? 40.0;
  const power = baseMachine.powerKw ?? 4.2;

  return Array.from({ length: 12 }, (_, i) => {
    const minAgo = 11 - i;
    const time = new Date(Date.now() - minAgo * 25000).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    return {
      time,
      current: Number((current + (Math.sin(i * 0.8) * 0.4)).toFixed(1)),
      voltage: Math.round(voltage + Math.cos(i * 0.5)),
      temperature: Number((temp + (Math.sin(i * 0.4) * 0.6)).toFixed(1)),
      powerKw: Number((power + (Math.sin(i * 0.7) * 0.2)).toFixed(1)),
    };
  });
}

const initialMachines = mockMachines.map((machine, index) => ({
  ...machine,
  state: machine.status,
  stateSince: nowMinusMinutes(machine.stateMinutes),
  lastCommunicationAt:
    machine.status === MACHINE_STATUS.SEM_COMUNICACAO
      ? nowMinusMinutes(machine.stateMinutes)
      : nowMinusSeconds(2 + (index % 7)),
  lastKnownStatus: machine.lastKnownStatus || MACHINE_STATUS.OPERANDO,
  operatingTimeToday: 24480 + index * 180,
  stoppedTimeToday: 1800 + index * 90,
  alarmTimeToday: index % 3 ? 0 : 780,
  emergencyTimeToday: machine.status === MACHINE_STATUS.EMERGENCIA ? 720 : 0,
  sensors: ["Corrente", "Tensão", "Temperatura", "Ciclo", "Potência"],
  digitalSignals: {
    emergencia: machine.status === MACHINE_STATUS.EMERGENCIA,
    alarme: machine.status === MACHINE_STATUS.ALARME,
    ciclo: machine.status === MACHINE_STATUS.OPERANDO,
    manutencao: machine.status === MACHINE_STATUS.MANUTENCAO,
  },
  firmwareVersion: "v1.4.2",
  uptimeSeconds: 172800 + index * 3600,
  isNew: false,
  telemetryBuffer: generateInitialTelemetryBuffer(machine),
  currentTrend: index % 3 === 0 ? "UP" : index % 2 === 0 ? "STABLE" : "DOWN",
  tempTrend: index % 4 === 0 ? "UP" : "STABLE",
  powerTrend: "STABLE",
}));

const initialAlerts = initialMachines
  .filter((machine) => isActiveProblem(machine.status))
  .map((machine) => {
    const existing = mockAlerts.find((alert) => alert.machineId === machine.id);
    return {
      id: existing?.id || `initial-${machine.id}`,
      severity: machine.status,
      machineId: machine.id,
      machineName: machine.name,
      companyName: companies.find((company) => company.id === machine.companyId)?.name,
      unitName: units.find((unit) => unit.id === machine.unitId)?.name,
      time: existing?.time || machine.lastUpdate,
      occurredAt: machine.stateSince,
      stateSince: machine.stateSince,
      minutesAgo: machine.stateMinutes,
      critical: false,
      isNew: false,
    };
  });

const initialEvents = mockEvents.map((event, index) => {
  const machine = initialMachines.find((item) => item.id === event.machineId);
  const relatedAlert = initialAlerts.find((item) => item.machineId === event.machineId);
  return {
    ...event,
    type: "STATE_CHANGE",
    status: machine?.status || MACHINE_STATUS.OPERANDO,
    occurredAt: relatedAlert?.occurredAt || nowMinusMinutes(45 + index * 12),
    machineName: machine?.name,
    companyId: machine?.companyId,
    companyName: companies.find((company) => company.id === machine?.companyId)?.name,
    unitName: units.find((unit) => unit.id === machine?.unitId)?.name,
    lastKnownStatus: machine?.lastKnownStatus,
    isActive: Boolean(relatedAlert),
  };
});

function playCriticalSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = 740;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.35);
  } catch {
    /* AudioContext bloqueado pelo navegador */
  }
}

export function MonitoringProvider({ children }) {
  const demoMode = USE_MOCKS;
  const [connectionError, setConnectionError] = useState(null);
  const [loading, setLoading] = useState(!demoMode);
  const [selectedScope, setSelectedScope] = useState({ type: SCOPE_TYPES.GLOBAL, id: null });
  const [selectedUnitId, setSelectedUnitId] = useState(null);
  const [machineState, setMachineState] = useState(demoMode ? initialMachines : []);
  const [activeAlerts, setActiveAlerts] = useState(demoMode ? initialAlerts : []);
  const [events, setEvents] = useState(demoMode ? initialEvents : []);
  const [history, setHistory] = useState(demoMode ? mockHistory : []);
  const [notifications, setNotifications] = useState(demoMode ? mockAlerts.map((alert) => ({ ...alert, read: false })) : []);
  const [toasts, setToasts] = useState([]);
  const [lastSync, setLastSync] = useState(null);
  const [apiConnected, setApiConnected] = useState(false);

  useEffect(() => {
    setMachineState(demoMode ? initialMachines : []);
    setActiveAlerts(demoMode ? initialAlerts : []);
    setEvents(demoMode ? initialEvents : []);
    setHistory(demoMode ? mockHistory : []);
    setNotifications([]);
    setToasts([]);
    setLastSync(null);
    setConnectionError(null);
    setApiConnected(false);
    setLoading(!demoMode);
    if (demoMode) return undefined;
    return startPolling(async isCancelled => {
      const fresh = await api.getMachines();
      if (isCancelled()) return;
      const samples = fresh.flatMap(machine => (machine.readings || []).map(reading => readingEvent(reading, machine)))
        .sort((a, b) => Date.parse(b.occurredAt) - Date.parse(a.occurredAt));
      setMachineState(fresh);
      setHistory(samples);
      setEvents(samples);
      setActiveAlerts(fresh.filter(machine => isActiveProblem(machine.status)).map(machine => ({
        id: 'api-' + machine.backendId, severity: machine.status,
        machineId: machine.id, machineName: machine.name,
        companyName: '', unitName: '', occurredAt: machine.stateSince,
        stateSince: machine.stateSince, time: machine.stateSince ? new Date(machine.stateSince).toLocaleTimeString('pt-BR') : '—',
        critical: machine.status === MACHINE_STATUS.EMERGENCIA,
      })));
      setApiConnected(true);
      setConnectionError(null);
      setLoading(false);
      setLastSync(new Date());
    }, error => {
      setApiConnected(false);
      setConnectionError(error.message || 'Backend indisponível');
      setLoading(false);
      setMachineState(markStale);
      setActiveAlerts([]);
    });
  }, [demoMode]);

  // -------------------------------------------------------------
  // Gradual Realistic Live Telemetry Simulation Timer (3.5s interval)
  // -------------------------------------------------------------
  useEffect(() => {
    if (!demoMode) return undefined;
    const timer = setInterval(() => {
      setMachineState((currentMachines) =>
        currentMachines.map((m) => {
          if (m.status === MACHINE_STATUS.SEM_COMUNICACAO || m.current === null) {
            return m;
          }

          const isRunning = m.status === MACHINE_STATUS.OPERANDO;
          const isStopped = m.status === MACHINE_STATUS.PARADA;

          let deltaCurrent = 0;
          let deltaTemp = 0;
          let deltaPower = 0;

          if (isRunning) {
            deltaCurrent = (Math.random() - 0.49) * 0.3;
            deltaTemp = (Math.random() - 0.48) * 0.2;
            deltaPower = (Math.random() - 0.49) * 0.15;
          } else if (isStopped) {
            deltaCurrent = (Math.random() - 0.5) * 0.05;
            deltaTemp = -0.1; // cooling down
            deltaPower = 0;
          }

          const newCurrent = Number(Math.max(0, m.current + deltaCurrent).toFixed(1));
          const newTemp = Number(Math.max(22, (m.temperature || 35) + deltaTemp).toFixed(1));
          const newPower = Number(Math.max(0, (m.powerKw || 3.5) + deltaPower).toFixed(1));
          const newVoltage = Math.round(220 + (Math.random() - 0.5) * 3);

          const timeStr = new Date().toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });

          const currentTrend = deltaCurrent > 0.08 ? "UP" : deltaCurrent < -0.08 ? "DOWN" : "STABLE";
          const tempTrend = deltaTemp > 0.05 ? "UP" : deltaTemp < -0.05 ? "DOWN" : "STABLE";

          const newBuffer = [
            ...(m.telemetryBuffer || []).slice(-14),
            {
              time: timeStr,
              current: newCurrent,
              voltage: newVoltage,
              temperature: newTemp,
              powerKw: newPower,
            },
          ];

          return {
            ...m,
            current: newCurrent,
            voltage: newVoltage,
            temperature: newTemp,
            powerKw: newPower,
            currentTrend,
            tempTrend,
            telemetryBuffer: newBuffer,
            lastCommunicationAt: new Date().toISOString(),
          };
        })
      );
      setLastSync(new Date());
    }, 4000);

    return () => clearInterval(timer);
  }, [demoMode]);

  // -------------------------------------------------------------
  // Dynamic State Change Event Handler
  // -------------------------------------------------------------
  const applyMachineEvent = useCallback((payload) => {
    const occurredAt = payload.occurredAt || new Date().toISOString();
    const changedMachine = machineState.find((machine) => machine.id === payload.machineId);
    if (!changedMachine) return;

    setMachineState((current) =>
      current.map((machine) =>
        machine.id === payload.machineId
          ? {
              ...machine,
              lastKnownStatus: machine.status,
              status: payload.status,
              state: payload.status,
              stateSince: occurredAt,
              lastCommunicationAt: occurredAt,
              current: payload.current !== undefined ? payload.current : machine.current,
              voltage: payload.voltage !== undefined ? payload.voltage : machine.voltage,
              temperature: payload.temperature !== undefined ? payload.temperature : machine.temperature,
              powerKw: payload.powerKw !== undefined ? payload.powerKw : machine.powerKw,
              communicationStatus: payload.communicationStatus || (payload.status === MACHINE_STATUS.SEM_COMUNICACAO ? "OFFLINE" : "ONLINE"),
              isNew: true,
            }
          : machine
      )
    );

    setTimeout(
      () =>
        setMachineState((current) =>
          current.map((machine) => (machine.id === payload.machineId ? { ...machine, isNew: false } : machine))
        ),
      8000
    );

    const id = `live-${Date.now()}`;
    const severity = payload.status;
    const alert = {
      id,
      severity,
      machineId: payload.machineId,
      machineName: changedMachine.name,
      companyName: companies.find((company) => company.id === changedMachine.companyId)?.name || "Cliente",
      unitName: units.find((unit) => unit.id === changedMachine.unitId)?.name || "Unidade",
      time: new Date(occurredAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      occurredAt,
      stateSince: occurredAt,
      minutesAgo: 0,
      critical: Boolean(payload.critical),
      isNew: true,
    };

    if (isActiveProblem(payload.status)) {
      setActiveAlerts((current) => [alert, ...current.filter((item) => item.machineId !== payload.machineId)]);
    } else {
      setActiveAlerts((current) => current.filter((item) => item.machineId !== payload.machineId));
    }

    const wasProblem = isActiveProblem(changedMachine.status);
    const resolved = wasProblem && !isActiveProblem(payload.status);

    const event = {
      id,
      type: resolved ? "PROBLEM_RESOLVED" : "STATE_CHANGE",
      time: new Date(occurredAt).toLocaleTimeString("pt-BR"),
      machineId: payload.machineId,
      machineName: changedMachine.name,
      companyId: changedMachine.companyId,
      companyName: alert.companyName,
      unitName: alert.unitName,
      status: payload.status,
      previousStatus: changedMachine.status,
      resolvedStatus: resolved ? changedMachine.status : null,
      durationSeconds: resolved
        ? Math.max(0, Math.floor((new Date(occurredAt).getTime() - new Date(changedMachine.stateSince).getTime()) / 1000))
        : null,
      isActive: isActiveProblem(payload.status),
      text: resolved ? `${changedMachine.status} encerrada` : `entrou em ${payload.status}`,
      occurredAt,
      lastKnownStatus: changedMachine.lastKnownStatus,
    };

    setEvents((current) => [event, ...current]);
    setHistory((current) => [{ id, time: alert.time, machineId: payload.machineId, status: payload.status, occurredAt }, ...current]);
    setNotifications((current) => [{ ...alert, read: false }, ...current]);
    setToasts((current) => [
      {
        ...alert,
        title: resolved
          ? `${getStatusConfig(changedMachine.status).label} encerrada`
          : payload.status === MACHINE_STATUS.EMERGENCIA
          ? "Nova emergência detectada"
          : "Novo evento de máquina",
        resolved,
      },
      ...current,
    ]);

    setLastSync(new Date());
    if (payload.status === MACHINE_STATUS.EMERGENCIA) playCriticalSound();
  }, [machineState]);

  useEffect(() => demoMode ? monitoringEvents.on("machine:state-change", applyMachineEvent) : undefined, [applyMachineEvent, demoMode]);

  const dismissToast = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), []);

  const selectGlobal = useCallback(() => {
    setSelectedScope({ type: SCOPE_TYPES.GLOBAL, id: null });
    setSelectedUnitId(null);
  }, []);

  const selectClient = useCallback((id) => {
    setSelectedScope({ type: SCOPE_TYPES.CLIENT, id });
    setSelectedUnitId(null);
  }, []);

  const selectUnit = useCallback((unitId) => {
    setSelectedUnitId(unitId);
  }, []);

  const clearUnit = useCallback(() => {
    setSelectedUnitId(null);
  }, []);

  const value = useMemo(() => {
    let visibleMachines = machineState;
    if (selectedScope.type === SCOPE_TYPES.CLIENT) {
      visibleMachines = machineState.filter((machine) => machine.companyId === selectedScope.id);
    }
    if (selectedUnitId) {
      visibleMachines = visibleMachines.filter((machine) => machine.unitId === selectedUnitId);
    }

    const ids = new Set(visibleMachines.map((machine) => machine.id));

    const scopeSummary = {
      total: visibleMachines.length,
      operating: visibleMachines.filter((m) => m.status === MACHINE_STATUS.OPERANDO).length,
      stopped: visibleMachines.filter((m) => m.status === MACHINE_STATUS.PARADA).length,
      alarms: visibleMachines.filter((m) => m.status === MACHINE_STATUS.ALARME).length,
      emergencies: visibleMachines.filter((m) => m.status === MACHINE_STATUS.EMERGENCIA).length,
      maintenance: visibleMachines.filter((m) => m.status === MACHINE_STATUS.MANUTENCAO).length,
      offline: visibleMachines.filter((m) =>
        [MACHINE_STATUS.SEM_COMUNICACAO, MACHINE_STATUS.DADOS_DESATUALIZADOS].includes(m.status)
      ).length,
      telemetryAbnormal: visibleMachines.filter((m) => {
        const curEval = evaluateCurrent(m.current, m.currentLimit || 22);
        const tempEval = evaluateTemperature(m.temperature, m.temperatureLimit || 65);
        return curEval.isAbnormal || tempEval.isAbnormal;
      }).length,
      unusualPower: visibleMachines.filter((m) => {
        const powerEval = evaluatePower(m.powerKw, m.status, m.powerAvg || 4.2);
        return powerEval.isUnusual;
      }).length,
    };

    const activeCompany =
      selectedScope.type === SCOPE_TYPES.CLIENT
        ? companies.find((company) => company.id === selectedScope.id) || null
        : null;

    const activeUnit = selectedUnitId ? units.find((u) => u.id === selectedUnitId) || null : null;

    const availableUnitsForScope = selectedScope.type === SCOPE_TYPES.CLIENT
      ? units.filter((u) => u.companyId === selectedScope.id)
      : units;

    return {
      selectedScope,
      selectedUnitId,
      activeCompany,
      activeUnit,
      availableUnits: demoMode ? availableUnitsForScope : [],
      companies: demoMode ? companies : [],
      units: demoMode ? units : [],
      sectors: demoMode ? sectors : [],
      demoMode, apiConnected, connectionError, loading,
      machines: visibleMachines,
      allMachines: machineState,
      scopeSummary,
      allAlerts: sortActiveProblems(activeAlerts),
      alerts: sortActiveProblems(activeAlerts.filter((alert) => ids.has(alert.machineId))),
      recentEvents: events.filter((event) => ids.has(event.machineId)),
      allEvents: events,
      history: history.filter((item) => ids.has(item.machineId)),
      notifications,
      toasts,
      lastSync,
      selectGlobal,
      selectClient,
      selectUnit,
      clearUnit,
      dismissToast,
      companyId: activeCompany?.id || "ALL",
      setCompanyId: (id) => (id === "ALL" ? selectGlobal() : selectClient(id)),
    };
  }, [
    demoMode, apiConnected, connectionError, loading,
    selectedScope,
    selectedUnitId,
    machineState,
    activeAlerts,
    events,
    history,
    notifications,
    toasts,
    lastSync,
    selectGlobal,
    selectClient,
    selectUnit,
    clearUnit,
    dismissToast,
  ]);

  return <MonitoringContext.Provider value={value}>{children}</MonitoringContext.Provider>;
}

export function useMonitoring() {
  const context = useContext(MonitoringContext);
  if (!context) throw new Error("useMonitoring precisa estar dentro de MonitoringProvider");
  return context;
}
