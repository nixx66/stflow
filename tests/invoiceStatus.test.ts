import test from "node:test";
import assert from "node:assert/strict";
import {
  getCheckoutAuthorization,
  getInvoiceWalletRole,
  getPayerAuthorization,
  getInvoiceStatus,
  getPaymentEligibility,
  normalizeInvoiceStatus
} from "../lib/invoiceStatus.ts";
import type { Invoice } from "../types/invoice.ts";

const baseInvoice: Invoice = {
  id: "af-test",
  merchantWallet: "0x0000000000000000000000000000000000000001",
  title: "Test invoice",
  amount: "25",
  currency: "USDC",
  status: "pending",
  chainId: 5042002,
  createdAt: "2026-07-01T00:00:00.000Z"
};

test("normalizes pending invoices with past expiration to expired", () => {
  const invoice = {
    ...baseInvoice,
    expiresAt: "2026-07-01T00:00:00.000Z"
  };

  assert.equal(getInvoiceStatus(invoice, new Date("2026-07-07T00:00:00.000Z")), "expired");
  assert.equal(normalizeInvoiceStatus(invoice, new Date("2026-07-07T00:00:00.000Z")).status, "expired");
});

test("keeps pending invoices payable before expiration", () => {
  const invoice = {
    ...baseInvoice,
    expiresAt: "2026-07-09T00:00:00.000Z"
  };

  assert.equal(getInvoiceStatus(invoice, new Date("2026-07-07T00:00:00.000Z")), "pending");
  assert.deepEqual(getPaymentEligibility(invoice, new Date("2026-07-07T00:00:00.000Z")), {
    canPay: true,
    reason: null
  });
});

test("blocks payment for expired or paid invoices", () => {
  assert.deepEqual(
    getPaymentEligibility(
      { ...baseInvoice, expiresAt: "2026-07-01T00:00:00.000Z" },
      new Date("2026-07-07T00:00:00.000Z")
    ),
    { canPay: false, reason: "expired" }
  );

  assert.deepEqual(
    getPaymentEligibility({ ...baseInvoice, status: "paid" }, new Date("2026-07-07T00:00:00.000Z")),
    { canPay: false, reason: "paid" }
  );
});

test("identifies merchant and payer wallet roles", () => {
  const invoice = {
    ...baseInvoice,
    customerWallet: "0x0000000000000000000000000000000000000002"
  };

  assert.equal(getInvoiceWalletRole(invoice, baseInvoice.merchantWallet), "merchant");
  assert.equal(getInvoiceWalletRole(invoice, invoice.customerWallet), "designated_payer");
  assert.equal(getInvoiceWalletRole(invoice, "0x0000000000000000000000000000000000000003"), "other");
  assert.equal(getInvoiceWalletRole(invoice), "unknown");
});

test("authorizes only the assigned payer wallet for invoice checkout", () => {
  const invoice = {
    ...baseInvoice,
    customerWallet: "0x0000000000000000000000000000000000000002"
  };

  assert.deepEqual(getPayerAuthorization(invoice), {
    canPay: false,
    reason: "wallet_required",
    expectedWallet: invoice.customerWallet
  });

  assert.deepEqual(getPayerAuthorization(invoice, invoice.merchantWallet), {
    canPay: false,
    reason: "merchant_wallet",
    expectedWallet: invoice.customerWallet
  });

  assert.deepEqual(getPayerAuthorization(invoice, "0x0000000000000000000000000000000000000003"), {
    canPay: false,
    reason: "wrong_payer_wallet",
    expectedWallet: invoice.customerWallet
  });

  assert.deepEqual(getPayerAuthorization(invoice, invoice.customerWallet), {
    canPay: true,
    reason: null,
    expectedWallet: invoice.customerWallet
  });
});

test("rejects a different connected wallet before mock checkout", () => {
  const invoice = {
    ...baseInvoice,
    customerWallet: "0x0000000000000000000000000000000000000002"
  };

  assert.deepEqual(
    getCheckoutAuthorization(
      invoice,
      "0x0000000000000000000000000000000000000003"
    ),
    {
      canPay: false,
      paymentReason: null,
      payerReason: "wrong_payer_wallet",
      expectedWallet: invoice.customerWallet
    }
  );
});

test("allows any non-merchant wallet when an invoice has no assigned payer", () => {
  assert.deepEqual(getPayerAuthorization(baseInvoice, "0x0000000000000000000000000000000000000003"), {
    canPay: true,
    reason: null,
    expectedWallet: undefined
  });
});
