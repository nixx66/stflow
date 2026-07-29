import type { Invoice, Receipt } from "../types/invoice.ts";

const walletKey = (wallet?: string | null) => wallet?.trim().toLowerCase();

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
  const key = walletKey(wallet);
  return key ? invoices.filter((invoice) => walletKey(invoice.merchantWallet) === key) : [];
}

export function filterInvoicesByPayer(invoices: Invoice[], wallet?: string) {
  const key = walletKey(wallet);
  return key ? invoices.filter((invoice) => walletKey(invoice.customerWallet) === key) : [];
}
