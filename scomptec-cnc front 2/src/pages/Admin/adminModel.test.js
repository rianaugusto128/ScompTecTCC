import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultRules, demoMachines, signalProblems } from "./adminModel.js";
import { isAdminUser, readSessionUser } from "../../services/adminSession.js";

test("ausência de sessão, perfil comum e JSON inválido não liberam a interface", () => {
  const values = new Map();
  globalThis.localStorage = { getItem: (key) => values.get(key) ?? null };
  assert.equal(readSessionUser(), null);
  values.set("scomptec_access_token", "token-de-teste");
  values.set("scomptec_user", "{");
  assert.equal(readSessionUser(), null);
  values.set("scomptec_user", JSON.stringify({ name: "Teste", role: "operator" }));
  assert.equal(isAdminUser(readSessionUser()), false);
  values.set("scomptec_user", JSON.stringify({ name: "Teste", role: "admin" }));
  assert.equal(isAdminUser(readSessionUser()), true);
  values.delete("scomptec_access_token");
  assert.equal(readSessionUser(), null);
  delete globalThis.localStorage;
});

test("perfil vazio ou desconhecido não é administrador", () => {
  for (const role of [undefined, null, "maintenance", "viewer", "superuser", ""]) assert.equal(isAdminUser({ role }), false);
});

test("sinais normais não geram alertas e limites alterados são aplicados", () => {
  assert.deepEqual(signalProblems(demoMachines[0], defaultRules), []);
  assert.deepEqual(signalProblems(demoMachines[0], { ...defaultRules, current: 10 }), ["Corrente elevada"]);
});

test("máquina offline não interpreta leituras antigas como atuais", () => {
  assert.deepEqual(signalProblems({ ...demoMachines[1], communicationStatus: "OFFLINE" }, defaultRules), ["Sem comunicação"]);
});

test("leituras ausentes não são tratadas como tensão zero", () => {
  assert.deepEqual(signalProblems({ status: "OPERANDO", current: null, voltage: null, temperature: null }, defaultRules), []);
});

test("emergência é sinalizada mesmo sem medições analógicas", () => {
  assert.ok(signalProblems({ status: "EMERGENCIA" }, defaultRules).includes("Emergência acionada"));
});
