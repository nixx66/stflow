import type { Invoice } from "../types/invoice.ts";
import { parseUsdc } from "./format.ts";

function normalizeWallet(wallet?: string | null) {
  const trimmedWallet = wallet?.trim();
  return trimmedWallet ? trimmedWallet.toLowerCase() : undefined;
}

export function getConsoleWalletScope(wallet?: string | null) {
  return {
    wallet: wallet?.trim()
  };
}

export function getConsoleInvoiceData(invoices: Invoice[], wallet?: string | null) {
  const normalizedWallet = normalizeWallet(wallet);

  if (!normalizedWallet) {
    return {
      receivables: [] as Invoice[],
      payables: [] as Invoice[],
      summary: {
        totalInvoices: 0,
        receivableCount: 0,
        payableCount: 0,
        paidCount: 0,
        pendingReceivableAmount: 0n,
        pendingPayableAmount: 0n,
        totalReceived: 0n,
        totalPayableDue: 0n,
        successRate: 0,
        counterpartyCount: 0
      }
    };
  }

  const receivables = invoices.filter((invoice) => {
    return normalizeWallet(invoice.merchantWallet) === normalizedWallet;
  });
  const payables = invoices.filter((invoice) => {
    return (
      normalizeWallet(invoice.customerWallet) === normalizedWallet &&
      normalizeWallet(invoice.merchantWallet) !== normalizedWallet
    );
  });
  const totalReceived = receivables
    .filter((invoice) => invoice.status === "paid")
    .reduce((sum, invoice) => sum + parseUsdc(invoice.amount), 0n);
  const pendingReceivableAmount = receivables
    .filter((invoice) => invoice.status === "pending")
    .reduce((sum, invoice) => sum + parseUsdc(invoice.amount), 0n);
  const pendingPayableAmount = payables
    .filter((invoice) => invoice.status === "pending")
    .reduce((sum, invoice) => sum + parseUsdc(invoice.amount), 0n);
  const totalPayableDue = payables.reduce((sum, invoice) => sum + parseUsdc(invoice.amount), 0n);
  const activeInvoices = [...receivables, ...payables].filter((invoice) => invoice.status !== "expired");
  const paidCount = [...receivables, ...payables].filter((invoice) => invoice.status === "paid").length;
  const counterparties = new Set(
    [...receivables, ...payables]
      .map((invoice) => {
        if (normalizeWallet(invoice.merchantWallet) === normalizedWallet) {
          return normalizeWallet(invoice.customerWallet || invoice.payerWallet);
        }

        return normalizeWallet(invoice.merchantWallet);
      })
      .filter(Boolean)
  );

  return {
    receivables,
    payables,
    summary: {
      totalInvoices: receivables.length + payables.length,
      receivableCount: receivables.length,
      payableCount: payables.length,
      paidCount,
      pendingReceivableAmount,
      pendingPayableAmount,
      totalReceived,
      totalPayableDue,
      successRate: activeInvoices.length ? Math.round((paidCount / activeInvoices.length) * 100) : 0,
      counterpartyCount: counterparties.size
    }
  };
}
