// Pure transformations shared by monitoring and its regression tests.
export function readAnalog(signals, ...keys) {
  for (const key of keys) {
    const value = signals?.[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

export function buildTelemetryBuffer(readings = []) {
  return [...new Map(readings.map(reading => [reading.id ?? reading.timestamp, reading])).values()]
    .filter(reading => Number.isFinite(Date.parse(reading.timestamp)))
    .sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp))
    .slice(-100)
    .map(reading => ({
      timestamp: Date.parse(reading.timestamp),
      time: new Date(reading.timestamp).toLocaleTimeString("pt-BR"),
      current: readAnalog(reading.analog_signals, "current", "corrente"),
      voltage: readAnalog(reading.analog_signals, "voltage", "tensao"),
      temperature: readAnalog(reading.analog_signals, "temperature", "temperatura"),
      powerKw: readAnalog(reading.analog_signals, "power_kw", "powerKw", "potencia_kw"),
      machineActive: typeof reading.machine_active === "boolean" ? Number(reading.machine_active) : null,
      digital: Object.fromEntries(Object.entries(reading.digital_signals || {})
        .map(([key, value]) => [key, typeof value === "boolean" ? Number(value) : null])),
    }));
}

export function readingStatus(reading) {
  const digital = Object.fromEntries(Object.entries(reading.digital_signals || {}).map(([key, value]) => [key.toLowerCase(), value]));
  if (reading.voltage_24v === false) return "DESLIGADA";
  if (digital.emergencia || digital.emergency) return "EMERGENCIA";
  if (digital.alarme || digital.alarm) return "ALARME";
  if (digital.manutencao || digital.maintenance) return "MANUTENCAO";
  if (reading.machine_active || digital.ciclo || digital.cycle) return "OPERANDO";
  return "PARADA";
}

export function readingEvent(reading, machine) {
  const status = readingStatus(reading);
  return {
    id: `telemetry-${reading.id}`, machineId: machine.id, machineName: machine.name,
    type: "TELEMETRY_SAMPLE", status, occurredAt: reading.timestamp,
    time: new Date(reading.timestamp).toLocaleTimeString("pt-BR"),
    text: `Leitura recebida: ${status}`, isActive: false,
  };
}

export function markStale(machines) {
  return machines.map(machine => ({ ...machine,
    lastKnownStatus: machine.lastKnownStatus || machine.status,
    status: "DADOS_DESATUALIZADOS", state: "DADOS_DESATUALIZADOS",
    communicationStatus: "UNKNOWN",
  }));
}

// Schedule only after completion: requests never overlap and errors keep retrying.
export function startPolling(refresh, onError, interval = 5000) {
  let stopped = false;
  let timer;
  async function run() {
    try { await refresh(() => stopped); }
    catch (error) { if (!stopped) onError(error); }
    finally { if (!stopped) timer = setTimeout(run, interval); }
  }
  run();
  return () => { stopped = true; clearTimeout(timer); };
}
