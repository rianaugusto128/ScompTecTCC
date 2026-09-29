import test from "node:test";
import assert from "node:assert/strict";
import { readingStatus, readingEvent, markStale, startPolling, buildTelemetryBuffer } from "./telemetry.js";
import { readFileSync } from "node:fs";

test("chart displays real mesa digital readings without inventing analog measurements", () => {
  const sample = JSON.parse(readFileSync(new URL("../../../firmware/opta_mesa_monitor/mesa_sample.json", import.meta.url), "utf8"));
  const [point] = buildTelemetryBuffer([sample]);
  assert.equal(point.current, null);
  assert.equal(point.machineActive, 1);
  assert.equal(point.digital.alarme, 0);
  assert.equal(point.digital.altura_pequena_bloqueada, 1);
  assert.equal(point.timestamp, Date.parse(sample.timestamp));
});

test("chart orders, deduplicates and bounds readings, preserving zero and missing values", () => {
  const readings = Array.from({ length: 105 }, (_, i) => ({
    id: String(i), timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, i)).toISOString(),
    analog_signals: { corrente: i, tensao: 0, temperatura: null, power_kw: Infinity },
  }));
  const result = buildTelemetryBuffer([...readings].reverse().concat(readings[104], { id: "invalid", timestamp: "invalid" }));
  assert.equal(result.length, 100);
  assert.equal(result[0].current, 5);
  assert.equal(result.at(-1).current, 104);
  assert.equal(result[0].voltage, 0);
  assert.equal(result[0].temperature, null);
  assert.equal(result[0].powerKw, null);
  assert.equal(buildTelemetryBuffer([]).length, 0);
  assert.equal(readings.length, 105);
});

test("mesa sample does not invent power-off when 24 V is unmeasured", () => {
  const sample = JSON.parse(readFileSync(new URL("../../../firmware/opta_mesa_monitor/mesa_sample.json", import.meta.url), "utf8"));
  assert.equal(readingStatus(sample), "OPERANDO");
  assert.equal(readingStatus({...sample, machine_active: false, digital_signals: {alarme: true}}), "ALARME");
  assert.equal(readingStatus({machine_active: false}), "PARADA");
  assert.equal(sample.extra_signals.mesa.entradas_brutas.I3, false);
  assert.equal(sample.digital_signals.altura_pequena_bloqueada, true);
});

test("Op­ta status priority matches backend", () => {
  const base = { machine_active: true, voltage_24v: true };
  assert.equal(readingStatus(base), "OPERANDO");
  assert.equal(readingStatus({...base, machine_active: false}), "PARADA");
  assert.equal(readingStatus({...base, digital_signals: {Emergency: true, alarm: true}}), "EMERGENCIA");
  assert.equal(readingStatus({...base, digital_signals: {maintenance: true}}), "MANUTENCAO");
  assert.equal(readingStatus({...base, voltage_24v: false, digital_signals: {emergency: true}}), "DESLIGADA");
});

test("API outage preserves measurements and their actual time", () => {
  const original = {id: "CNC-001", status: "OPERANDO", current: 12, lastCommunicationAt: "2026-09-10T12:00:00Z"};
  const [stale] = markStale([original]);
  assert.equal(stale.current, 12);
  assert.equal(stale.lastCommunicationAt, original.lastCommunicationAt);
  assert.equal(stale.status, "DADOS_DESATUALIZADOS");
  assert.equal(stale.communicationStatus, "UNKNOWN");
  assert.equal(original.status, "OPERANDO");
});

test("history is a persisted sample, not a fabricated state transition", () => {
  const event = readingEvent({id: "sample", timestamp: "2026-01-01T15:00:00Z", machine_active: true, voltage_24v: true}, {id: "CNC-001", name: "CNC 01"});
  assert.equal(event.type, "TELEMETRY_SAMPLE");
  assert.equal(event.occurredAt, "2026-01-01T15:00:00Z");
  assert.equal(event.machineId, "CNC-001");
});

test("polling recovers after error, does not overlap and stops on cleanup", async () => {
  let attempts = 0, errors = 0, active = 0, peak = 0;
  let resolveRecovered;
  const recovered = new Promise(resolve => { resolveRecovered = resolve; });
  const stop = startPolling(async () => {
    attempts++; active++; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    if (attempts === 1) throw new Error("offline");
    resolveRecovered();
  }, () => errors++, 1);
  await recovered;
  stop();
  const before = attempts;
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(errors, 1);
  assert.equal(peak, 1);
  assert.equal(attempts, before);
});
