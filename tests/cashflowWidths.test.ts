import assert from "node:assert/strict";
import test from "node:test";
import { cashflowWidth } from "../lib/cashflow.ts";

test("cashflow widths preserve relative bigint proportions", () => {
  assert.equal(cashflowWidth(0n, 10n), "0%");
  assert.equal(cashflowWidth(1n, 10n), "10%");
  assert.equal(cashflowWidth(9n, 10n), "90%");
  assert.notEqual(cashflowWidth(1n, 10n), cashflowWidth(9n, 10n));
});

test("cashflow widths remain bounded for huge bigint totals", () => {
  const max = 340282366920938463463374607431768211455n;
  assert.equal(cashflowWidth(max, max), "100%");
  assert.equal(cashflowWidth(max / 3n, max), "33.33%");
});
