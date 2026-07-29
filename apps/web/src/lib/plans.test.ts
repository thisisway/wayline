import { test } from "node:test";
import assert from "node:assert/strict";
import { effectivePlan, isKnownPlan, resolvePlan, trialActive, trialDaysLeft } from "./plans";

const NOW = 1_700_000_000_000;
const future = new Date(NOW + 5 * 24 * 3600 * 1000); // +5 dias
const past = new Date(NOW - 1000);

test("isKnownPlan / resolvePlan", () => {
  assert.equal(isKnownPlan("pro"), true);
  assert.equal(isKnownPlan("xpto"), false);
  assert.equal(isKnownPlan(null), false);
  assert.equal(resolvePlan("pro").id, "pro");
  assert.equal(resolvePlan("xpto").id, "business"); // fallback legado
});

test("trialActive só é true com data futura", () => {
  assert.equal(trialActive(future, NOW), true);
  assert.equal(trialActive(past, NOW), false);
  assert.equal(trialActive(null, NOW), false);
});

test("trialDaysLeft arredonda pra cima e zera se expirado", () => {
  assert.equal(trialDaysLeft(future, NOW), 5);
  assert.equal(trialDaysLeft(past, NOW), 0);
});

test("effectivePlan: Free em trial ativo enxerga Business; expirado volta a Free", () => {
  assert.equal(effectivePlan("free", future, NOW).id, "business");
  assert.equal(effectivePlan(null, future, NOW).id, "business");
  assert.equal(effectivePlan("free", past, NOW).id, "free");
  // Quem já assinou mantém o plano mesmo em trial.
  assert.equal(effectivePlan("pro", future, NOW).id, "pro");
});
