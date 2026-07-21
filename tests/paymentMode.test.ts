import test from "node:test";
import assert from "node:assert/strict";
import {
  getPaymentButtonLabel,
  getPaymentMode,
  getPaymentModeLabel,
  isLivePaymentMode
} from "../lib/paymentMode.ts";

test("defaults to mock payment mode when no live mode is configured", () => {
  assert.equal(getPaymentMode(""), "mock");
  assert.equal(getPaymentMode("unknown"), "mock");
  assert.equal(getPaymentMode(undefined), "mock");
  assert.equal(isLivePaymentMode(getPaymentMode("")), false);
});

test("recognizes live USDC transfer mode", () => {
  const mode = getPaymentMode("erc20-transfer");

  assert.equal(mode, "erc20-transfer");
  assert.equal(isLivePaymentMode(mode), true);
  assert.equal(getPaymentModeLabel(mode), "USDC live");
  assert.equal(getPaymentButtonLabel(mode), "Pay USDC");
});

test("recognizes future memo transfer mode label without enabling fake memo payments", () => {
  const mode = getPaymentMode("memo-transfer");

  assert.equal(mode, "memo-transfer");
  assert.equal(isLivePaymentMode(mode), true);
  assert.equal(getPaymentModeLabel(mode), "Memo live");
  assert.equal(getPaymentButtonLabel(mode), "Pay USDC with memo");
});
