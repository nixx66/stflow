import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { payerError } from "../lib/paymentError.ts";

test("payerError maps wallet authorization failures", () => {
  assert.equal(payerError("merchant_wallet"), "Merchant wallet cannot pay its own invoice.");
  assert.equal(
    payerError("wrong_payer_wallet"),
    "Switch to the payer wallet assigned to this invoice."
  );
  assert.equal(
    payerError("wallet_required"),
    "Connect the payer wallet assigned to this invoice."
  );
});

test("payment panel keeps a retry control without exposing raw RPC details", () => {
  const panel = fs.readFileSync("components/PaymentPanel.tsx", "utf8");

  assert.match(panel, />Retry</);
  assert.doesNotMatch(panel, /RPC Request failed|Raw Call Arguments|calldata/);

  const hook = fs.readFileSync("hooks/usePayInvoice.ts", "utf8");
  assert.doesNotMatch(hook, /retryArcRead\(\(\) =>\s*writeContract/);
});

test("confirmed payments remain successful while chain data reconciles", () => {
  const panel = fs.readFileSync("components/PaymentPanel.tsx", "utf8");
  const hook = fs.readFileSync("hooks/usePayInvoice.ts", "utf8");

  assert.match(
    panel,
    /invoice\.status === 1 \|\| state\.stage === "success"/
  );
  assert.match(panel, /Payment confirmed on Arc Testnet/);
  assert.match(panel, /链上数据正在同步/);
  assert.match(panel, /paymentConfirmed && isSyncing/);
  assert.match(hook, /markInvoiceReceiptConfirmed\(submitted\)/);

  const eventConfirmed = hook.indexOf("validateInvoicePaid(receipt");
  const stateConfirmed = hook.indexOf(
    'dispatch({ type: "payment_confirmed", requestId: paymentRequest })',
    eventConfirmed
  );
  const reconciliation = hook.indexOf(
    'functionName: "getInvoice"',
    stateConfirmed
  );
  assert.ok(eventConfirmed >= 0);
  assert.ok(stateConfirmed > eventConfirmed);
  assert.ok(reconciliation > stateConfirmed);
});

test("confirmed payment does not redirect until reconciliation completes", () => {
  const panel = fs.readFileSync("components/PaymentPanel.tsx", "utf8");
  const hook = fs.readFileSync("hooks/usePayInvoice.ts", "utf8");

  assert.match(panel, /result\.reconciled/);
  assert.match(panel, /!paymentConfirmed/);
  assert.match(hook, /reconciled: false/);
  assert.match(hook, /confirmedInvoice\.current.*chainInvoice\.status === 0/s);
  assert.match(hook, /result\.status === "error".*reconciliationFailed = true/s);
  assert.match(hook, /setIsSyncing\(true\).*Payment proof could not be verified/s);
});
