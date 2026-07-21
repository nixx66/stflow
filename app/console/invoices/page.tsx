"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Copy,
  Link2,
  QrCode,
  ReceiptText,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { DataPanel } from "@/components/console/DataPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { useInvoices } from "@/hooks/useInvoice";
import { getConsoleInvoiceData, getConsoleWalletScope } from "@/lib/consoleInvoiceData";
import { copyToClipboard, formatCurrency, formatDate, shortenAddress } from "@/lib/format";
import { buildSharedInvoicePayPath, buildSharedInvoicePayUrl } from "@/lib/sharedInvoiceLink";
import { Invoice } from "@/types/invoice";

function InvoiceRows({
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

export default function ConsoleInvoicesPage() {
  const { address } = useAccount();
  const { invoices, isReady } = useInvoices();
  const walletScope = useMemo(() => getConsoleWalletScope(address), [address]);
  const { payables, receivables, summary } = useMemo(
    () => getConsoleInvoiceData(invoices, walletScope.wallet),
    [invoices, walletScope.wallet]
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
          <p className="text-sm font-black text-arc-600">Invoice console</p>
          <h2 className="mt-3 max-w-4xl text-4xl font-black leading-[1.02] tracking-tight text-ink md:text-5xl">
            Live invoice ledger for the connected wallet.
          </h2>
          <p className="mt-5 max-w-3xl text-lg font-semibold leading-8 text-muted">
            This workspace now reads the same invoice records used by the create, pay, receipt, and dashboard flows. Counts update from your local STFlow ledger instead of fixed demo data.
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-black text-ink">{summary.totalInvoices}</p>
              <p className="mt-1 text-sm font-bold text-muted">All live invoices</p>
            </div>
            <div className="rounded-2xl bg-arc-50 p-4">
              <p className="text-2xl font-black text-arc-900">{summary.receivableCount}</p>
              <p className="mt-1 text-sm font-bold text-arc-700">Receivables</p>
            </div>
            <div className="rounded-2xl bg-amber-50 p-4">
              <p className="text-2xl font-black text-amber-900">{summary.payableCount}</p>
              <p className="mt-1 text-sm font-bold text-amber-700">Payables</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-2xl font-black text-ink">{formatCurrency(summary.totalReceived)}</p>
              <p className="mt-1 text-sm font-bold text-muted">Received</p>
            </div>
          </div>
          {walletScope.isDemo ? (
            <p className="mt-5 rounded-2xl border border-arc-100 bg-arc-50 px-4 py-3 text-sm font-bold text-arc-800">
              Demo ledger is active. Connect a wallet to switch this console to wallet-scoped live data.
            </p>
          ) : null}
          {!walletScope.isDemo && !isReady ? (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
              Loading local invoice ledger...
            </p>
          ) : null}
        </div>

        <DataPanel eyebrow="How to read this" title="Wallet role logic">
          <div className="space-y-3">
            {[
              [
                "Receivables",
                "invoice.merchantWallet is your connected wallet. You created the invoice and wait for another wallet to pay.",
                ArrowDownLeft
              ],
              [
                "Payables",
                "invoice.customerWallet is your connected wallet. Another merchant created the invoice and assigned it to you.",
                ArrowUpRight
              ],
              [
                "Live local ledger",
                "The console reads the same local API-backed invoice records that payment links and receipts use.",
                WalletCards
              ]
            ].map(([title, body, Icon]) => (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4" key={title as string}>
                <div className="flex items-start gap-3">
                  <span className="rounded-xl bg-white p-2 text-arc-600">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-black text-ink">{title as string}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-muted">{body as string}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DataPanel>
      </section>

      <DataPanel
        eyebrow="Receivables"
        title="Invoices you issued for other wallets to pay"
        action={<span className="font-mono text-xs font-bold text-muted">{shortenAddress(walletScope.wallet, 6)}</span>}
      >
        <InvoiceRows invoices={receivables} role="receivable" />
      </DataPanel>

      <DataPanel
        eyebrow="Payables"
        title="Invoices issued by other merchants for your wallet to pay"
        action={<span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Live wallet inbox</span>}
      >
        <InvoiceRows invoices={payables} role="payable" />
      </DataPanel>
    </div>
  );
}
