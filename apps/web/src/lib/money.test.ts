import { test } from "node:test";
import assert from "node:assert/strict";
import { toCents, toInput } from "./money";

test("toCents interpreta pt-BR (vírgula decimal, ponto milhar)", () => {
  assert.equal(toCents("10,50"), 1050);
  assert.equal(toCents("1.234,56"), 123456);
  assert.equal(toCents("0"), 0);
  assert.equal(toCents("100"), 10000); // R$ 100,00
});

test("toInput emite formato que toCents relê (round-trip) — o bug dos 100x", () => {
  for (const cents of [0, 5, 99, 1050, 4999, 123456, 1]) {
    assert.equal(toCents(toInput(cents)), cents, `round-trip falhou em ${cents}`);
  }
});

test("toInput NUNCA emite ponto decimal (que toCents trataria como milhar)", () => {
  assert.equal(toInput(1050), "10,50");
  assert.ok(!toInput(4999).includes("."), "não pode conter ponto");
});

test("toCents nunca retorna negativo nem NaN", () => {
  assert.equal(toCents("-50"), 0);
  assert.equal(toCents("abc"), 0);
  assert.equal(toCents(""), 0);
});
