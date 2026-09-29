import test from "node:test";
import assert from "node:assert/strict";
import { summarizeUtilization } from "./utilization.js";

const machine = (entries) => ({ utilization: { buckets: Array.from({ length: 24 }, (_, i) => ({
  timestamp: new Date(Date.UTC(2026, 8, 15, i)).toISOString(), duration_seconds: 3600,
  samples: entries[i] ? 1 : 0, seconds: entries[i] || {},
})) } });

test("utilization weighs time rather than sample count and combines visible machines", () => {
  const result = summarizeUtilization([machine({23: {OPERANDO: 60, PARADA: 30}}), machine({23: {ALARME: 30}})]);
  assert.equal(result.utilization, 50);
  assert.equal(result.observed, 120);
  assert.equal(result.samples, 2);
  assert.equal(result.capacity, 2 * 24 * 3600);
  assert.equal(result.data.at(-1).ALARME, 25);
  assert.equal(result.data[0].OPERANDO, null);
});

test("8/12/24 hour selection changes both the chart and summary", () => {
  const machines = [machine({0: {OPERANDO: 10}, 12: {PARADA: 20}, 23: {ALARME: 30}})];
  assert.equal(summarizeUtilization(machines, 24).observed, 60);
  assert.equal(summarizeUtilization(machines, 12).observed, 50);
  assert.equal(summarizeUtilization(machines, 8).observed, 30);
  assert.equal(summarizeUtilization(machines, 8).data.length, 8);
});

test("empty and entirely stopped periods are distinguishable", () => {
  assert.equal(summarizeUtilization([machine({})]).utilization, null);
  assert.equal(summarizeUtilization([machine({23: {PARADA: 15}})]).utilization, 0);
  assert.equal(summarizeUtilization([]).coverage, 0);
});

test("normal operation stays at zero and increasing alerts raise the curve", () => {
  const result = summarizeUtilization([machine({
    20: {OPERANDO: 100},
    21: {OPERANDO: 75, ALARME: 25},
    22: {OPERANDO: 25, ALARME: 50, EMERGENCIA: 25},
    23: {EMERGENCIA: 100},
  })]);
  assert.deepEqual(result.data.slice(-4).map(point => point.alertRate), [0, 25, 75, 100]);
  assert.equal(result.peakAlertRate, 100);
  assert.equal(result.alertRate, 50);
  assert.equal(result.data[0].alertRate, null);
});

test("relative time places newest interval at zero and respects selected window", () => {
  const machines = [machine({23: {ALARME: 60}})];
  for (const hours of [8, 12, 24]) {
    const result = summarizeUtilization(machines, hours);
    assert.equal(result.data.at(-1).ageHours, 0);
    assert.equal(result.data[0].ageHours, hours - 1);
    assert.equal(result.data.at(-1).alertRate, 100);
  }
});

test("stopped and maintenance states are not mistaken for alarm events", () => {
  const result = summarizeUtilization([machine({23: {PARADA: 20, MANUTENCAO: 20, DESLIGADA: 20}})]);
  assert.equal(result.alertRate, 0);
  assert.equal(result.utilization, 0);
});
