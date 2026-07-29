import test from "node:test";
import assert from "node:assert/strict";
import { getConsoleInvoiceData, getConsoleWalletScope } from "../lib/consoleInvoiceData.ts";
import type { Invoice } from "../types/invoice.ts";

const walletA = "0x000000000000000000000000000000000000000A";
const walletB = "0x000000000000000000000000000000000000000b";
const walletC = "0x000000000000000000000000000000000000000c";

function makeInvoice(id: string, overrides: Partial<Invoice>): Invoice {
  return {
    id,
    merchantWallet: walletA,
    customerWallet: walletB,
    title: "USDC checkout invoice",
    amount: "100",
    currency: "USDC",
    status: "pending",
    chainId: 5042002,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides
  };
}

test("builds console data from invoices for the connected merchant wallet", () => {
  const invoices = [
    makeInvoice("af-receivable-paid", { amount: "250", status: "paid" }),
    makeInvoice("af-receivable-pending", { amount: "125" }),
    makeInvoice("af-payable", {
      merchantWallet: walletC,
      customerWallet: walletA,
      amount: "80"
    })
  ];

  const data = getConsoleInvoiceData(invoices, walletA);

  assert.equal(data.summary.totalInvoices, 3);
  assert.equal(data.summary.receivableCount, 2);
  assert.equal(data.summary.payableCount, 1);
  assert.equal(data.summary.totalReceived, 250);
  assert.deepEqual(data.receivables.map((invoice) => invoice.id), [
    "af-receivable-paid",
    "af-receivable-pending"
  ]);
  assert.deepEqual(data.payables.map((invoice) => invoice.id), ["af-payable"]);
});

test("returns empty live console data when no wallet is connected", () => {
  const data = getConsoleInvoiceData([makeInvoice("af-demo", {})]);

  assert.equal(data.summary.totalInvoices, 0);
  assert.deepEqual(data.receivables, []);
  assert.deepEqual(data.payables, []);
});

test("does not invent a wallet scope when no wallet is connected", () => {
  const scope = getConsoleWalletScope();

  assert.equal(scope.wallet, undefined);
});
