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

function inBrowser() {
  return typeof window !== "undefined";
}

function writeStoredInvoices(invoices: Invoice[]) {
  if (!inBrowser()) return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
  } catch {
    // Browser storage can be unavailable or full; keep the UI usable.
  }
}

function emitInvoiceChange() {
  if (!inBrowser()) return;

  try {
    window.dispatchEvent(new Event("stflow:invoices"));
  } catch {
    // Some embedded browsers restrict synthetic events.
  }
}

function seedInvoices() {
  const invoices = normalizeInvoiceStatuses(mockInvoices);
  writeStoredInvoices(invoices);
  return invoices;
}

export function getStoredInvoices(): Invoice[] {
  if (!inBrowser()) return normalizeInvoiceStatuses(mockInvoices);

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) return seedInvoices();

    const invoices = normalizeInvoiceStatuses(JSON.parse(stored) as Invoice[]);
    writeStoredInvoices(invoices);
    return invoices;
  } catch {
    return seedInvoices();
  }
}

export function saveStoredInvoices(invoices: Invoice[]) {
  if (!inBrowser()) return;
  writeStoredInvoices(invoices);
  emitInvoiceChange();
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

function paidInvoice(invoice: Invoice, payerWallet: string, paymentTxHash: string, paidAt: string): Invoice {
  return { ...invoice, payerWallet, paymentTxHash, paidAt, status: "paid" };
}

export function markInvoicePaid(
  invoiceId: string,
  payerWallet: string,
  paymentTxHash: string
) {
  const invoices = getStoredInvoices();
  const paidAt = new Date().toISOString();
  let updatedInvoice: Invoice | null = null;
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

    updatedInvoice = paidInvoice(normalizedInvoice, payerWallet, paymentTxHash, paidAt);
    return updatedInvoice;
  });

  if (!foundInvoice) {
    const fallbackInvoice = getV2InvoiceAsInvoice(invoiceId);

    if (!fallbackInvoice || !getPaymentEligibility(fallbackInvoice).canPay) {
      saveStoredInvoices(nextInvoices);
      return null;
    }

    updatedInvoice = paidInvoice(fallbackInvoice, payerWallet, paymentTxHash, paidAt);

    saveStoredInvoices([updatedInvoice, ...nextInvoices]);
    return updatedInvoice;
  }

  saveStoredInvoices(nextInvoices);
  return updatedInvoice;
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
  const invoicesById = new Map<string, Invoice>();
  const fallbackIds: string[] = [];
  const preferredIds: string[] = [];
  const preferredIdSet = new Set<string>();

  for (const invoice of fallbackInvoices) {
    if (invoicesById.has(invoice.id)) continue;
    invoicesById.set(invoice.id, invoice);
    fallbackIds.push(invoice.id);
  }

  for (const invoice of preferredInvoices) {
    if (preferredIdSet.has(invoice.id)) continue;
    invoicesById.set(invoice.id, invoice);
    preferredIds.push(invoice.id);
    preferredIdSet.add(invoice.id);
  }

  return [...preferredIds, ...fallbackIds.filter((id) => !preferredIdSet.has(id))].map(
    (id) => invoicesById.get(id)!
  );
}

export function createMockTxHash() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return `0x${Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}
