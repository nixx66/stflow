"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Link2,
  QrCode,
  ReceiptText
} from "lucide-react";
import Link from "next/link";
import { copyToClipboard, formatCurrency, formatDate, shortenAddress } from "@/lib/format";
import { buildSharedInvoicePayPath, buildSharedInvoicePayUrl } from "@/lib/sharedInvoiceLink";
import { Invoice } from "@/types/invoice";
import { StatusBadge } from "../StatusBadge";

export function InvoiceRows({
  invoices,
  role
}: {
  invoices: Invoice[];
  role: "receivable" | "payable";
}) {
  if (invoices.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-sm font-semibold text-muted">
        No live invoices match this wallet role yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left">
        <thead>
          <tr className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">
            <th className="pb-4">Invoice</th>
            <th className="pb-4">Counterparty</th>
            <th className="pb-4">Wallet role</th>
            <th className="pb-4">Amount</th>
            <th className="pb-4">Status</th>
            <th className="pb-4">Settlement objects</th>
            <th className="pb-4">Action</th>
            <th className="pb-4">Memo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((invoice) => {
            const counterparty =
              role === "receivable"
                ? invoice.customerName || "Payer wallet"
                : "Merchant wallet";
            const counterpartyWallet =
              role === "receivable" ? invoice.customerWallet || invoice.payerWallet : invoice.merchantWallet;
            const roleLabel = role === "receivable" ? "You receive" : "You pay";
            const roleWallet = role === "receivable" ? invoice.merchantWallet : invoice.customerWallet;
            const paymentPath = buildSharedInvoicePayPath(invoice);

            return (
              <tr className="align-top" key={invoice.id}>
                <td className="py-4 pr-4">
                  <p className="font-black text-ink">{invoice.id}</p>
                  <p className="mt-1 text-sm font-semibold text-muted">{invoice.title}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{formatDate(invoice.createdAt)}</p>
                </td>
                <td className="py-4 pr-4">
                  <p className="text-sm font-black text-ink">{counterparty}</p>
                  <p className="mt-1 font-mono text-xs font-bold text-muted">
                    {shortenAddress(counterpartyWallet, 6)}
                  </p>
                </td>
                <td className="py-4 pr-4">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                      role === "receivable"
                        ? "bg-arc-50 text-arc-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {role === "receivable" ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    )}
                    {roleLabel}
                  </span>
                  <p className="mt-2 font-mono text-xs font-bold text-slate-500">
                    {shortenAddress(roleWallet, 6)}
                  </p>
                </td>
                <td className="py-4 pr-4 text-sm font-black text-ink">
                  {formatCurrency(invoice.amount)}
                </td>
                <td className="py-4 pr-4">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="py-4 pr-4">
                  <div className="flex gap-2">
                    <span className="rounded-full bg-arc-50 p-2 text-arc-600" title="Payment link">
                      <Link2 className="h-4 w-4" />
                    </span>
                    <span className="rounded-full bg-arc-50 p-2 text-arc-600" title="Shared invoice payload">
                      <QrCode className="h-4 w-4" />
                    </span>
                    <span
                      className={`rounded-full p-2 ${
                        invoice.status === "paid"
                          ? "bg-arc-50 text-arc-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                      title="Receipt"
                    >
                      <ReceiptText className="h-4 w-4" />
                    </span>
                    <span
                      className={`rounded-full p-2 ${
                        invoice.paymentTxHash
                          ? "bg-arc-50 text-arc-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                      title="Proof"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </span>
                  </div>
                </td>
                <td className="py-4 pr-4">
                  {role === "payable" && invoice.status === "pending" ? (
                    <Link
                      className="inline-flex h-9 items-center justify-center rounded-xl bg-ink px-3 text-xs font-black text-white transition hover:bg-slate-800"
                      href={paymentPath}
                    >
                      Pay invoice
                    </Link>
                  ) : invoice.status === "paid" ? (
                    <Link
                      className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-arc-100 hover:bg-arc-50"
                      href={`/receipt/${invoice.id}`}
                    >
                      Receipt
                    </Link>
                  ) : (
                    <button
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 transition hover:border-arc-100 hover:bg-arc-50"
                      onClick={() => {
                        if (typeof window === "undefined") return;
                        void copyToClipboard(buildSharedInvoicePayUrl(window.location.origin, invoice));
                      }}
                      type="button"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy link
                    </button>
                  )}
                </td>
                <td className="max-w-xs py-4 text-sm font-semibold leading-6 text-muted">
                  {invoice.memo || "-"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
