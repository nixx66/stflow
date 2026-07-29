import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSharedInvoicePayPath,
  buildSharedInvoicePayUrl
} from "../lib/sharedInvoiceLink.ts";

const id = `0x${"a".repeat(64)}`;

test("payment links carry only the canonical onchain invoice id", () => {
  assert.equal(buildSharedInvoicePayPath({ id }), `/pay/${id}`);
  assert.equal(buildSharedInvoicePayUrl("https://stflow.example", { id }), `https://stflow.example/pay/${id}`);
});

test("payment links reject non-bytes32 identifiers", () => {
  assert.throws(() => buildSharedInvoicePayPath({ id: "invoice-7" }), /canonical onchain/i);
});
