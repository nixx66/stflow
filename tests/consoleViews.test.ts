import test from "node:test";
import assert from "node:assert/strict";
import {
  customerRows,
  invoiceAnalytics,
  invoiceCsv,
  orderRows
} from "../lib/consoleViews.ts";
import type { Invoice } from "../types/invoice.ts";

const wallet = "0x000000000000000000000000000000000000000A";
const customer = "0x000000000000000000000000000000000000000b";
const merchant = "0x000000000000000000000000000000000000000c";

function invoice(id: string, overrides: Partial<Invoice> = {}): Invoice {
  return {
    id,
    merchantWallet: wallet,
    customerWallet: customer,
    title: "Quarterly settlement",
    description: "Operations",
    amount: "100",
    currency: "USDC",
    status: "pending",
    chainId: 5042002,
    createdAt: "2026-08-01T00:00:00.000Z",
    expiresAt: "2026-08-08T00:00:00.000Z",
    ...overrides
  };
}

test("groups counterparties case-insensitively and keeps both wallet roles", () => {
  const rows = customerRows([
    invoice("issued", { amount: "125" }),
    invoice("paid", {
      customerWallet: customer.toUpperCase(),
      amount: "50",
      status: "paid"
    }),
    invoice("received", {
      merchantWallet: merchant,
      customerWallet: wallet,
      amount: "20"
    })
  ], wallet);

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    wallet: customer.toLowerCase(),
    name: undefined,
    relationship: "receivable",
    invoiceCount: 2,
    pendingAmount: 125_000_000n,
    settledAmount: 50_000_000n
  });
  assert.equal(rows[1].relationship, "payable");
});

test("maps settlement orders and analytics from only the connected wallet", () => {
  const invoices = [
    invoice("issued"),
    invoice("received", {
      merchantWallet: merchant,
      customerWallet: wallet,
      amount: "80",
      status: "paid"
    }),
    invoice("unrelated", {
      merchantWallet: merchant,
      customerWallet: customer,
      amount: "999"
    })
  ];

  const orders = orderRows(invoices, wallet);
  const analytics = invoiceAnalytics(invoices, wallet);

  assert.deepEqual(orders.map((row) => [row.invoice.id, row.direction]), [
    ["issued", "receivable"],
    ["received", "payable"]
  ]);
  assert.equal(analytics.totalInvoices, 2);
  assert.equal(analytics.status.pending.count, 1);
  assert.equal(analytics.status.paid.amount, 80_000_000n);
  assert.equal(analytics.receivableAmount, 100_000_000n);
  assert.equal(analytics.payableAmount, 80_000_000n);
});

test("exports wallet invoices as an escaped UTF-8 CSV", () => {
  const csv = invoiceCsv([
    invoice("csv", {
      title: "Setup, support \"and\" training\nphase two"
    })
  ], wallet);

  assert.match(csv, /^Invoice ID,Direction,Merchant,Payer,Title,Amount,Currency,Status,Created At,Due At,Paid At\r\n/);
  assert.match(csv, /"Setup, support ""and"" training\nphase two"/);
  assert.doesNotMatch(csv, /unrelated/);
});
