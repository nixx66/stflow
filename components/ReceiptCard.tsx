"use client";

import { ArrowLeft, Copy, ExternalLink, Printer } from "lucide-react";
import Link from "next/link";
import { copyToClipboard, formatCurrency, formatDate, shortenAddress } from "@/lib/format";
import { Receipt } from "@/types/invoice";
import { StatusBadge } from "./StatusBadge";

export function ReceiptCard({ receipt }: { receipt: Receipt }) {
  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-arc-600">Payment Receipt</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">{receipt.receiptNumber}</h1>
          <p className="mt-2 text-sm text-muted">Commercial USDC payment record for settlement review.</p>
        </div>
        <StatusBadge status="paid" />
      </div>

      <div className="my-8 rounded-lg bg-slate-50 p-6">
        <p className="text-sm text-muted">Amount paid</p>
        <p className="mt-1 text-4xl font-bold text-ink">
          {formatCurrency(receipt.amount, receipt.currency)}
        </p>
      </div>

      <dl className="grid gap-5 text-sm sm:grid-cols-2">
        <ReceiptItem label="Receipt No" value={receipt.receiptNumber} />
        <ReceiptItem label="Invoice ID" value={receipt.invoiceId} />
        <ReceiptItem label="Merchant Account" value={shortenAddress(receipt.merchantWallet, 6)} />
        <ReceiptItem label="Payer Account" value={shortenAddress(receipt.payerWallet, 6)} />
        <ReceiptItem label="Transaction Hash" value={shortenAddress(receipt.paymentTxHash, 6)} />
        <ReceiptItem label="Paid At" value={formatDate(receipt.paidAt)} />
        <ReceiptItem className="sm:col-span-2" label="Memo" value={receipt.memo || "-"} />
      </dl>

      <div className="no-print mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-ink transition hover:bg-slate-50"
          onClick={() => copyToClipboard(receipt.paymentTxHash)}
          type="button"
        >
          <Copy className="h-4 w-4" />
          Copy Tx Hash
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-ink transition hover:bg-slate-50"
          onClick={() => copyToClipboard(receipt.paymentTxHash)}
          type="button"
        >
          <ExternalLink className="h-4 w-4" />
          Copy Proof
        </button>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-ink transition hover:bg-slate-50"
          onClick={() => window.print()}
          type="button"
        >
          <Printer className="h-4 w-4" />
          Print / Save PDF
        </button>
        <Link
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-arc-600 px-4 text-sm font-semibold text-white transition hover:bg-arc-500"
          href="/dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}

function ReceiptItem({
  label,
  value,
  className = ""
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-slate-200 bg-white p-4 ${className}`}>
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-2 break-words font-semibold text-ink">{value}</dd>
    </div>
  );
}
