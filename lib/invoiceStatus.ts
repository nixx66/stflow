import type { Invoice } from "../types/invoice.ts";

export type PaymentBlockReason = "paid" | "expired" | null;
export type WalletRole = "merchant" | "designated_payer" | "other" | "unknown";
export type PayerBlockReason =
  | "wallet_required"
  | "merchant_wallet"
  | "wrong_payer_wallet"
  | null;

export function getInvoiceStatus(invoice: Invoice, now = new Date()): Invoice["status"] {
  if (invoice.status === "pending" && invoice.expiresAt) {
    const expiresAt = new Date(invoice.expiresAt).getTime();
    if (!Number.isNaN(expiresAt) && expiresAt <= now.getTime()) {
      return "expired";
    }
  }

  return invoice.status;
}

export function normalizeInvoiceStatus(invoice: Invoice, now = new Date()): Invoice {
  const status = getInvoiceStatus(invoice, now);
  return status === invoice.status ? invoice : { ...invoice, status };
}

export function normalizeInvoiceStatuses(invoices: Invoice[], now = new Date()) {
  return invoices.map((invoice) => normalizeInvoiceStatus(invoice, now));
}

export function getPaymentEligibility(invoice: Invoice, now = new Date()) {
  const status = getInvoiceStatus(invoice, now);

  if (status === "paid") {
    return { canPay: false, reason: "paid" as const };
  }

  if (status === "expired") {
    return { canPay: false, reason: "expired" as const };
  }

  return { canPay: true, reason: null };
}

const walletKey = (wallet?: string | null) => wallet?.trim().toLowerCase() || undefined;

export function getInvoiceWalletRole(invoice: Invoice, wallet?: string | null): WalletRole {
  const current = walletKey(wallet);
  const merchant = walletKey(invoice.merchantWallet);
  const customer = walletKey(invoice.customerWallet);

  if (!current) return "unknown";
  if (current === merchant) return "merchant";
  if (current === customer) return "designated_payer";
  return "other";
}

export function getPayerAuthorization(invoice: Invoice, wallet?: string | null) {
  const current = walletKey(wallet);
  const merchant = walletKey(invoice.merchantWallet);
  const customer = walletKey(invoice.customerWallet);
  const expectedWallet = invoice.customerWallet;

  if (!current) return { canPay: false, reason: "wallet_required" as const, expectedWallet };
  if (current === merchant) return { canPay: false, reason: "merchant_wallet" as const, expectedWallet };
  if (customer && current !== customer) return { canPay: false, reason: "wrong_payer_wallet" as const, expectedWallet };
  return { canPay: true, reason: null, expectedWallet };
}

export function getCheckoutAuthorization(
  invoice: Invoice,
  wallet?: string | null,
  now = new Date()
) {
  const payment = getPaymentEligibility(invoice, now);
  const payer = getPayerAuthorization(invoice, wallet);

  return {
    canPay: payment.canPay && payer.canPay,
    paymentReason: payment.reason,
    payerReason: payer.reason,
    expectedWallet: payer.expectedWallet
  };
}
