import test from "node:test";
import assert from "node:assert/strict";
import {
  filterInvoicesByPayer,
  mergeInvoicesById
} from "../lib/invoice.ts";
import type { Invoice } from "../types/invoice.ts";

const merchantWallet = "0x0000000000000000000000000000000000000001";
const payerWallet = "0x0000000000000000000000000000000000000002";

function makeInvoice(id: string, overrides: Partial<Invoice> = {}): Invoice {
  return {
    id,
    merchantWallet,
    customerWallet: payerWallet,
    title: "USDC checkout invoice",
    amount: "25",
    currency: "USDC",
    status: "pending",
    chainId: 5042002,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

test("filters invoices assigned to the connected payer wallet", () => {
  const incomingInvoice = makeInvoice("af-incoming");
  const otherInvoice = makeInvoice("af-other", {
    customerWallet: "0x0000000000000000000000000000000000000003"
  });

  assert.deepEqual(filterInvoicesByPayer([incomingInvoice, otherInvoice], payerWallet), [
    incomingInvoice
  ]);
});

test("merges server invoices ahead of local duplicates", () => {
  const serverInvoice = makeInvoice("af-shared", { amount: "50" });
  const localInvoice = makeInvoice("af-shared", { amount: "25" });
  const localOnlyInvoice = makeInvoice("af-local");

  assert.deepEqual(mergeInvoicesById([serverInvoice], [localInvoice, localOnlyInvoice]), [
    serverInvoice,
    localOnlyInvoice
  ]);
});
