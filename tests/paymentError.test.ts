import assert from "node:assert/strict";
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
