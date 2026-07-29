import { isHash } from "viem";

export function buildSharedInvoicePayPath(invoice: { id: string }) {
  if (!isHash(invoice.id) || invoice.id.length !== 66) {
    throw new Error("Payment links require a canonical onchain invoice ID.");
  }
  return `/pay/${invoice.id}`;
}

export function buildSharedInvoicePayUrl(origin: string, invoice: { id: string }) {
  return new URL(buildSharedInvoicePayPath(invoice), origin).toString();
}
