"use client";

import { Copy, ReceiptText } from "lucide-react";
import Link from "next/link";
import { copyToClipboard, formatCurrency, formatDate, shortenAddress } from "@/lib/format";
import { buildSharedInvoicePayUrl } from "@/lib/sharedInvoiceLink";
import { Invoice } from "@/types/invoice";
import { StatusBadge } from "./StatusBadge";

export function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const copyPaymentLink = () => {
    if (typeof window === "undefined") return;
    void copyToClipboard(buildSharedInvoicePayUrl(window.location.origin, invoice));
  };

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-ink">{invoice.title ?? "Metadata unavailable"}</p>
          <p className="mt-1 text-xs text-muted">{invoice.id}</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>

      <div className="mt-5 grid gap-3 text-sm">
        <div className="flex justify-between gap-3">
          <span className="text-muted">Amount</span>
          <span className="font-semibold text-ink">{formatCurrency(invoice.amount)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted">Created</span>
          <span className="text-ink">{formatDate(invoice.createdAt)}</span>
        </div>
        <div className="flex justify-between gap-3">
          <span className="text-muted">Tx</span>
          <span className="text-ink">{invoice.paymentTxHash ? shortenAddress(invoice.paymentTxHash) : "-"}</span>
        </div>
      </div>

      {invoice.status === "paid" ? (
        <Link
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-arc-600 transition hover:border-arc-200 hover:bg-arc-50"
          href={`/receipt/${invoice.id}`}
        >
          <ReceiptText className="h-4 w-4" />
          Open Receipt
        </Link>
      ) : (
        <button
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-arc-600 transition hover:border-arc-200 hover:bg-arc-50"
          onClick={copyPaymentLink}
          type="button"
        >
          <Copy className="h-4 w-4" />
          Copy Payment Link
        </button>
      )}
    </article>
  );
}
