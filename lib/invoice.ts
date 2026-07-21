import type { Invoice, Receipt } from "../types/invoice.ts";
import { ARC_TESTNET } from "./arc.ts";
import { getPaymentEligibility, normalizeInvoiceStatus, normalizeInvoiceStatuses } from "./invoiceStatus.ts";
import { mockInvoices } from "./mockData.ts";
import { getV2InvoiceAsInvoice } from "./v2MockData.ts";

const STORAGE_KEY = "stflow.invoices.v1";

export type CreateInvoiceInput = {
  merchantWallet: string;
  customerName?: string;
  customerWallet?: string;
  title: string;
  amount: string;
  description?: string;
  memo?: string;
  expiresAt?: string;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function writeInvoicesToBrowserStorage(invoices: Invoice[]) {
  if (!isBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  } catch {
    // Browser storage can be unavailable or full; keep the UI usable.
  }
}

function notifyInvoiceStorageChanged() {
  if (!isBrowser()) return;

  try {
    window.dispatchEvent(new Event("stflow:invoices"));
  } catch {
    // Some embedded browsers restrict synthetic events.
  }
}

export function getStoredInvoices(): Invoice[] {
  if (!isBrowser()) return normalizeInvoiceStatuses(mockInvoices);

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      const invoices = normalizeInvoiceStatuses(mockInvoices);
      writeInvoicesToBrowserStorage(invoices);
      return invoices;
    }

    const invoices = normalizeInvoiceStatuses(JSON.parse(stored) as Invoice[]);
    writeInvoicesToBrowserStorage(invoices);
    return invoices;
  } catch {
    const invoices = normalizeInvoiceStatuses(mockInvoices);
    writeInvoicesToBrowserStorage(invoices);
    return invoices;
  }
}

export function saveStoredInvoices(invoices: Invoice[]) {
  if (!isBrowser()) return;
  writeInvoicesToBrowserStorage(invoices);
  notifyInvoiceStorageChanged();
}

export function createMockInvoice(input: CreateInvoiceInput) {
  const invoices = getStoredInvoices();
  const invoice: Invoice = {
    id: `af-${Date.now().toString(36)}`,
    merchantWallet: input.merchantWallet,
    customerName: input.customerName,
    customerWallet: input.customerWallet,
    title: input.title,
    description: input.description,
    memo: input.memo,
    amount: input.amount,
    currency: "USDC",
    status: "pending",
    chainId: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || ARC_TESTNET.chainId),
    createdAt: new Date().toISOString(),
    expiresAt: input.expiresAt
  };

  saveStoredInvoices([invoice, ...invoices]);
  return invoice;
}

export function getInvoiceById(invoiceId: string) {
  return getStoredInvoices().find((invoice) => invoice.id === invoiceId) ?? getV2InvoiceAsInvoice(invoiceId) ?? undefined;
}

export function markInvoicePaid(
  invoiceId: string,
  payerWallet: string,
  paymentTxHash: string
) {
  const invoices = getStoredInvoices();
  const paidAt = new Date().toISOString();
  let paidInvoice: Invoice | null = null;
  let foundInvoice = false;
  const nextInvoices = invoices.map((invoice) => {
    const normalizedInvoice = normalizeInvoiceStatus(invoice);

    if (normalizedInvoice.id !== invoiceId) {
      return normalizedInvoice;
    }

    foundInvoice = true;
    if (!getPaymentEligibility(normalizedInvoice).canPay) {
      return normalizedInvoice;
    }

    paidInvoice = {
      ...normalizedInvoice,
      payerWallet,
      paymentTxHash,
      paidAt,
      status: "paid" as const
    };

    return paidInvoice;
  });

  if (!foundInvoice) {
    const fallbackInvoice = getV2InvoiceAsInvoice(invoiceId);

    if (!fallbackInvoice || !getPaymentEligibility(fallbackInvoice).canPay) {
      saveStoredInvoices(nextInvoices);
      return null;
    }

    paidInvoice = {
      ...fallbackInvoice,
      payerWallet,
      paymentTxHash,
      paidAt,
      status: "paid" as const
    };

    saveStoredInvoices([paidInvoice, ...nextInvoices]);
    return paidInvoice;
  }

  saveStoredInvoices(nextInvoices);
  return paidInvoice;
}

export function buildReceipt(invoice: Invoice): Receipt | null {
  if (!invoice.payerWallet || !invoice.paymentTxHash || !invoice.paidAt) return null;

  return {
    id: `rcpt-${invoice.id}`,
    invoiceId: invoice.id,
    receiptNumber: `STF-${invoice.id.toUpperCase()}`,
    merchantWallet: invoice.merchantWallet,
    payerWallet: invoice.payerWallet,
    amount: invoice.amount,
    currency: invoice.currency,
    paymentTxHash: invoice.paymentTxHash,
    paidAt: invoice.paidAt,
    memo: invoice.memo
  };
}

export function filterInvoicesByMerchant(invoices: Invoice[], wallet?: string) {
  if (!wallet) return [];
  return invoices.filter(
    (invoice) => invoice.merchantWallet.toLowerCase() === wallet.toLowerCase()
  );
}

export function filterInvoicesByPayer(invoices: Invoice[], wallet?: string) {
  if (!wallet) return [];
  return invoices.filter((invoice) => {
    return invoice.customerWallet?.toLowerCase() === wallet.toLowerCase();
  });
}

export function mergeInvoicesById(preferredInvoices: Invoice[], fallbackInvoices: Invoice[]) {
  const seenInvoiceIds = new Set<string>();
  const mergedInvoices: Invoice[] = [];

  [...preferredInvoices, ...fallbackInvoices].forEach((invoice) => {
    if (seenInvoiceIds.has(invoice.id)) return;
    seenInvoiceIds.add(invoice.id);
    mergedInvoices.push(invoice);
  });

  return mergedInvoices;
}

export function createMockTxHash() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}
