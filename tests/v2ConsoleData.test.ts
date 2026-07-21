import test from "node:test";
import assert from "node:assert/strict";
import {
  buildV2Csv,
  getV2Analytics,
  getV2ConsoleSummary,
  getV2InvoiceAsInvoice,
  getV2InvoiceDetail,
  getV2InvoicesByStatus,
  v2Invoices
} from "../lib/v2MockData.ts";

test("summarizes V2 console invoice and payment state", () => {
  const summary = getV2ConsoleSummary();

  assert.equal(summary.totalInvoices, v2Invoices.length);
  assert.equal(summary.statusCounts.paid, 3);
  assert.equal(summary.statusCounts.pending, 3);
  assert.equal(summary.statusCounts.draft, 2);
  assert.equal(summary.statusCounts.archived, 1);
  assert.equal(summary.totalReceived, 8300);
  assert.equal(summary.pendingAmount, 3065);
});

test("filters V2 invoices by status", () => {
  assert.equal(getV2InvoicesByStatus("paid").length, 3);
  assert.equal(getV2InvoicesByStatus("pending").every((invoice) => invoice.status === "pending"), true);
});

test("builds analytics and CSV export rows", () => {
  const analytics = getV2Analytics();
  const csv = buildV2Csv();

  assert.equal(analytics.successRate, 50);
  assert.equal(analytics.averagePaidInvoice, 2766.67);
  assert.ok(csv.startsWith("Invoice ID,Direction,Merchant,Payer,Order,Status,Amount,Currency,Created At"));
  assert.ok(csv.includes("v2-inv-1001,receivable,STFlow Demo Merchant,Helio Studio,Landing sprint,paid,1250,USDC"));
});

test("builds a V2 invoice detail bundle with customer, order, and audit timeline", () => {
  const detail = getV2InvoiceDetail("v2-inv-1001");

  assert.equal(detail?.invoice.id, "v2-inv-1001");
  assert.equal(detail?.customer.name, "Helio Studio");
  assert.equal(detail?.order.title, "Landing sprint");
  assert.equal(detail?.timeline.length, 5);
  assert.equal(detail?.timeline[0].label, "Invoice created");
  assert.equal(detail?.timeline[3].label, "USDC payment confirmed");
  assert.equal(detail?.timeline[3].state, "complete");
  assert.equal(getV2InvoiceDetail("missing-invoice"), null);
});

test("converts V2 console invoices into payment-page invoices", () => {
  const paidInvoice = getV2InvoiceAsInvoice("v2-inv-1001");
  const pendingInvoice = getV2InvoiceAsInvoice("v2-inv-1004");
  const draftInvoice = getV2InvoiceAsInvoice("v2-inv-1006");

  assert.equal(paidInvoice?.id, "v2-inv-1001");
  assert.equal(paidInvoice?.status, "paid");
  assert.equal(paidInvoice?.paymentTxHash?.startsWith("0x"), true);
  assert.equal(pendingInvoice?.status, "pending");
  assert.equal(pendingInvoice?.amount, "1800");
  assert.equal(draftInvoice, null);
});
