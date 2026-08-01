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
