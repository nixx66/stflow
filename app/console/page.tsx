"use client";

import {
  Copy,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { DataPanel } from "@/components/console/DataPanel";
import { ConsoleOverviewActivity } from "@/components/console/ConsoleOverviewActivity";
import { ConsoleShortcuts } from "@/components/console/ConsoleShortcuts";
import { StatusBadge } from "@/components/StatusBadge";
import { useInvoices } from "@/hooks/useInvoice";
import { getConsoleInvoiceData, getConsoleWalletScope } from "@/lib/consoleInvoiceData";
import { copyToClipboard, formatCurrency, formatDate, shortenAddress } from "@/lib/format";
import { buildSharedInvoicePayPath, buildSharedInvoicePayUrl } from "@/lib/sharedInvoiceLink";
import { Invoice } from "@/types/invoice";

function sortNewestFirst(invoices: Invoice[]) {
  return [...invoices].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function MetricCard({
  label,
  value,
  helper,
  tone = "neutral"
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "green" | "amber";
}) {
  const toneClass =
    tone === "green"
      ? "border-arc-100 bg-arc-50 text-arc-900"
      : tone === "amber"
        ? "border-amber-100 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-white text-ink";

  return (
    <div className={`rounded-3xl border p-5 shadow-card ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.13em] text-slate-500">{label}</p>
      <p className="mt-5 text-3xl font-black tracking-tight">{value}</p>
      <p className="mt-2 text-sm font-bold text-slate-500">{helper}</p>
    </div>
  );
}

function InvoiceMiniRow({
  invoice,
  role
}: {
  invoice: Invoice;
  role: "receivable" | "payable";
}) {
  const counterparty =
    role === "receivable"
      ? invoice.customerName || shortenAddress(invoice.customerWallet || invoice.payerWallet, 6)
      : shortenAddress(invoice.merchantWallet, 6);

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-sm font-black text-ink">{invoice.id}</p>
          <p className="mt-1 truncate text-sm font-black text-ink">{invoice.title}</p>
          <p className="mt-1 text-xs font-bold text-muted">{counterparty}</p>
        </div>
        <StatusBadge status={invoice.status} />
      </div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-black text-ink">{formatCurrency(invoice.amount)}</p>
          <p className="text-xs font-bold text-slate-400">{formatDate(invoice.createdAt)}</p>
        </div>
        {role === "payable" ? (
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-ink px-3 text-xs font-black text-white transition hover:bg-slate-800"
            href={buildSharedInvoicePayPath(invoice)}
          >
            Pay
            <ExternalLink className="h-3.5 w-3.5" />
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
            Copy
            <Copy className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyQueue({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-sm font-semibold text-muted">
      {label}
    </div>
  );
}

export default function ConsoleOverviewPage() {
  const { address } = useAccount();
  const { invoices, isReady } = useInvoices();
  const walletScope = useMemo(() => getConsoleWalletScope(address), [address]);
  const { payables, receivables, summary } = useMemo(
    () => getConsoleInvoiceData(invoices, walletScope.wallet),
    [invoices, walletScope.wallet]
  );
  const pendingReceivables = sortNewestFirst(
    receivables.filter((invoice) => invoice.status === "pending")
  );
  const paidReceivables = receivables.filter((invoice) => invoice.status === "paid");
  const pendingPayables = sortNewestFirst(payables.filter((invoice) => invoice.status === "pending"));
  const latestEvents = sortNewestFirst([...receivables, ...payables]).slice(0, 6);
  const totalExposure = summary.pendingReceivableAmount + summary.pendingPayableAmount;
  return (
    <div className="space-y-5">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-arc-600">Wallet ledger</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-ink md:text-4xl">
              Invoice command center
            </h2>
            <p className="mt-2 font-mono text-sm font-bold text-muted">
              {walletScope.isDemo ? `Demo wallet ${shortenAddress(walletScope.wallet, 8)}` : shortenAddress(walletScope.wallet, 8)}
            </p>
          </div>
          <div className="grid w-full gap-2 sm:grid-cols-3 xl:max-w-xl">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-3xl font-black text-ink">{summary.totalInvoices}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-muted">Total invoices</p>
            </div>
            <div className="rounded-2xl border border-arc-100 bg-arc-50 p-4">
              <p className="text-3xl font-black text-arc-900">{summary.receivableCount}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-arc-700">Issued by you</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
              <p className="text-3xl font-black text-amber-900">{summary.payableCount}</p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-amber-700">Sent to you</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            helper={`${paidReceivables.length} paid receivable invoices`}
            label="Received"
            tone="green"
            value={formatCurrency(summary.totalReceived)}
          />
          <MetricCard
            helper={`${pendingReceivables.length} invoices waiting for payer`}
            label="Outstanding receivable"
            value={formatCurrency(summary.pendingReceivableAmount)}
          />
          <MetricCard
            helper={`${pendingPayables.length} invoices require your action`}
            label="Payable due"
            tone="amber"
            value={formatCurrency(summary.pendingPayableAmount)}
          />
          <MetricCard
            helper={`${summary.counterpartyCount} counterparties indexed`}
            label="Open exposure"
            value={formatCurrency(totalExposure)}
          />
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
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <DataPanel
          action={<span className="rounded-full bg-arc-50 px-3 py-1 text-xs font-black text-arc-700">{pendingReceivables.length} pending</span>}
          eyebrow="Receivable watchlist"
          title="Invoices you opened and still need to collect"
        >
          <div className="grid gap-3">
            {pendingReceivables.length ? (
              pendingReceivables.slice(0, 4).map((invoice) => (
                <InvoiceMiniRow invoice={invoice} key={invoice.id} role="receivable" />
              ))
            ) : (
              <EmptyQueue label="No pending receivables. Paid and expired records stay in the full invoices ledger." />
            )}
          </div>
        </DataPanel>

        <DataPanel
          action={<span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">{pendingPayables.length} pending</span>}
          eyebrow="Payable inbox"
          title="Invoices assigned to your wallet for payment"
        >
          <div className="grid gap-3">
            {pendingPayables.length ? (
              pendingPayables.slice(0, 4).map((invoice) => (
                <InvoiceMiniRow invoice={invoice} key={invoice.id} role="payable" />
              ))
            ) : (
              <EmptyQueue label="No pending payables for this wallet." />
            )}
          </div>
        </DataPanel>
      </section>

      <ConsoleOverviewActivity latestEvents={latestEvents} receivables={receivables} summary={summary} />

      <ConsoleShortcuts />
    </div>
  );
}
