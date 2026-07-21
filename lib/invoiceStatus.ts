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

function normalizeWallet(wallet?: string | null) {
  const trimmedWallet = wallet?.trim();
  return trimmedWallet ? trimmedWallet.toLowerCase() : undefined;
}

export function getInvoiceWalletRole(invoice: Invoice, wallet?: string | null): WalletRole {
  const normalizedWallet = normalizeWallet(wallet);

  if (!normalizedWallet) return "unknown";

  if (normalizedWallet === normalizeWallet(invoice.merchantWallet)) {
    return "merchant";
  }

  if (invoice.customerWallet && normalizedWallet === normalizeWallet(invoice.customerWallet)) {
    return "designated_payer";
  }

  return "other";
}

export function getPayerAuthorization(invoice: Invoice, wallet?: string | null) {
  const normalizedWallet = normalizeWallet(wallet);

  if (!normalizedWallet) {
    return {
      canPay: false,
      reason: "wallet_required" as const,
      expectedWallet: invoice.customerWallet
    };
  }

  if (normalizedWallet === normalizeWallet(invoice.merchantWallet)) {
    return {
      canPay: false,
      reason: "merchant_wallet" as const,
      expectedWallet: invoice.customerWallet
    };
  }

  if (invoice.customerWallet && normalizedWallet !== normalizeWallet(invoice.customerWallet)) {
    return {
      canPay: false,
      reason: "wrong_payer_wallet" as const,
      expectedWallet: invoice.customerWallet
    };
  }

  return {
    canPay: true,
    reason: null,
    expectedWallet: invoice.customerWallet
  };
}
