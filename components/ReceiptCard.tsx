"use client";

import { ArrowLeft, Copy, ExternalLink, Printer } from "lucide-react";
import Link from "next/link";
import { getArcExplorerTxUrl } from "@/lib/arc";
import { copyToClipboard, formatDate, shortenAddress } from "@/lib/format";
import type { InvoiceMetadata } from "@/lib/invoiceMetadata";
import {
  formatUsdc,
  type ChainInvoice,
  type VerifiedPaymentProof
} from "@/lib/paymentTransaction";
import { StatusBadge } from "./StatusBadge";

export function ReceiptCard({
  invoice,
  metadata,
  proof
}: {
  invoice: ChainInvoice;
  metadata?: InvoiceMetadata;
  proof: VerifiedPaymentProof;
}) {
  const receiptNumber = `STF-${invoice.id.slice(2, 14).toUpperCase()}`;
  const paidAt = new Date(Number(invoice.paidAt) * 1000).toISOString();
  const paymentTxHash = proof.txHash;

  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-arc-600">Payment Receipt</p>
          <h1 className="mt-2 text-3xl font-bold text-ink">{receiptNumber}</h1>
          <p className="mt-2 text-sm text-muted">
            Verified Arc Testnet USDC settlement record.
          </p>
        </div>
        <StatusBadge status="paid" />
      </div>

      <div className="my-8 rounded-lg bg-slate-50 p-6">
        <p className="text-sm text-muted">Amount paid</p>
        <p className="mt-1 text-4xl font-bold text-ink">
          {formatUsdc(invoice.amount)} USDC
        </p>
      </div>

      <dl className="grid gap-5 text-sm sm:grid-cols-2">
        <ReceiptItem label="Receipt No" value={receiptNumber} />
        <ReceiptItem label="Invoice ID" value={invoice.id} />
        <ReceiptItem label="Merchant Account" value={shortenAddress(invoice.merchant, 6)} />
        <ReceiptItem label="Payer Account" value={shortenAddress(invoice.payer, 6)} />
        <ReceiptItem
          label="Transaction Hash"
          value={shortenAddress(paymentTxHash, 6)}
        />
        <ReceiptItem label="Paid At" value={formatDate(paidAt)} />
        <ReceiptItem
          className="sm:col-span-2"
          label="Memo"
          value={metadata?.memo || "Metadata unavailable"}
        />
      </dl>

      <div className="no-print mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:opacity-50"
          onClick={() => copyToClipboard(paymentTxHash)}
          type="button"
        >
          <Copy className="h-4 w-4" />
          Copy Tx Hash
        </button>
        <a
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-4 text-sm font-semibold text-ink transition hover:bg-slate-50"
          href={getArcExplorerTxUrl(paymentTxHash)}
          rel="noreferrer"
          target="_blank"
        >
          <ExternalLink className="h-4 w-4" />
          View on Arcscan
        </a>
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
