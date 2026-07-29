"use client";

import { ArrowUpRight, Clock3, FilePlus2, Landmark } from "lucide-react";
import Link from "next/link";
import { DashboardStats } from "@/components/DashboardStats";
import { InvoiceCard } from "@/components/InvoiceCard";
import { Navbar } from "@/components/Navbar";
import { TransactionTable } from "@/components/TransactionTable";
import { formatCurrency, shortenAddress } from "@/lib/format";
import { buildSharedInvoicePayPath } from "@/lib/sharedInvoiceLink";
import { useDashboard } from "@/hooks/useDashboard";

const loadingStatLabels = ["Total Received", "Paid Invoices", "Pending Invoices", "Total Volume"] as const;

export default function DashboardPage() {
  const { address, error, incomingInvoices, invoices, isConnected, isReady, refresh, stats, status } = useDashboard();
  const recentTransactions = invoices.filter((invoice) => invoice.status === "paid");

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-[1680px] px-3 py-10 sm:px-4 lg:px-6 2xl:px-8">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-arc-600">Settlement Dashboard</p>
            <h1 className="mt-2 text-3xl font-bold text-ink">USDC transaction operations</h1>
            <p className="mt-2 text-sm text-muted">
              {address ? `Connected wallet: ${shortenAddress(address, 6)}` : "Connect a wallet to load Arc Testnet invoices."}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm">
              <Landmark className="h-4 w-4 text-arc-600" />
              Arc Testnet registry
            </span>
            {isReady ? <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-arc-600 px-4 text-sm font-semibold text-white shadow-soft transition hover:bg-arc-500"
              href="/invoice/new"
            >
              <FilePlus2 className="h-4 w-4" />
              Create Invoice
            </Link> : null}
          </div>
        </div>

        {status === "error" ? (
          <div aria-live="assertive" className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">
            <span>{error}</span>
            <button className="shrink-0 underline" onClick={() => void refresh()} type="button">
              Retry
            </button>
          </div>
        ) : null}
        {status === "disconnected" ? (
          <div aria-live="polite" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900" role="status">
            Wallet connection is required. No invoice totals are shown until Arc Testnet data can be read.
          </div>
        ) : null}
        {status === "partial" ? (
          <div aria-live="polite" className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900" role="status">
            Chain amounts and statuses are current. Some descriptive metadata is missing or could not be verified.
          </div>
        ) : null}
        {isReady ? (
          <DashboardStats stats={stats} />
        ) : (
          status === "loading" ? <div aria-live="polite" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status">
            {loadingStatLabels.map((label) => (
              <article
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                key={label}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-muted">{label}</p>
                  <span className="h-9 w-9 animate-pulse rounded-md bg-arc-50" />
                </div>
                <div className="mt-5 h-8 w-28 animate-pulse rounded-md bg-slate-100" />
              </article>
            ))}
          </div> : null
        )}

        {isReady ? <>
        <section className="mt-10 rounded-[2rem] border border-[#c9ecd3] bg-[linear-gradient(135deg,rgba(231,248,236,0.92),rgba(255,255,255,0.8)_54%,rgba(255,248,232,0.76))] p-5 shadow-[0_30px_90px_rgba(4,41,31,0.08)] backdrop-blur-xl sm:p-6">
          <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0fa86b]">
                Payer inbox
              </p>
              <h2 className="mt-2 text-2xl font-black text-[#063f2c]">Invoices awaiting your payment</h2>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-muted">
                These invoices are assigned to the connected wallet and are separated from merchant-created records.
              </p>
            </div>
            <span className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-white/80 px-4 text-sm font-black text-[#063f2c] ring-1 ring-[#c9ecd3]">
              <Clock3 className="h-4 w-4 text-[#0fa86b]" />
              {incomingInvoices.length} pending
            </span>
          </div>

          {incomingInvoices.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {incomingInvoices.map((invoice) => (
                <div
                  className="flex flex-col gap-4 rounded-[1.35rem] border border-white/80 bg-white/75 p-4 shadow-[0_18px_55px_rgba(4,41,31,0.07)] backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
                  key={invoice.id}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-lg font-black text-ink">{invoice.title ?? "Metadata unavailable"}</p>
                      <span className="rounded-full bg-[#e7f8ec] px-3 py-1 text-xs font-black text-[#063f2c] ring-1 ring-[#c9ecd3]">
                        Payable
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-muted">
                      Merchant {shortenAddress(invoice.merchantWallet, 6)} / {invoice.id}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <p className="text-2xl font-black text-[#063f2c]">{formatCurrency(invoice.amount)}</p>
                    <Link
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#063f2c] px-4 text-sm font-black text-white transition hover:bg-[#04291f] active:translate-y-px"
                      href={buildSharedInvoicePayPath(invoice)}
                    >
                      Pay invoice
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.35rem] border border-dashed border-[#c9ecd3] bg-white/60 p-6 text-sm font-semibold text-muted">
              No pending invoices are assigned to this wallet.
            </div>
          )}
        </section>

        <section className="mt-10">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink">Invoices</h2>
              <p className="mt-1 text-sm text-muted">
                Records are read from the Arc Testnet registry for the connected wallet.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {invoices.slice(0, 6).map((invoice) => (
              <InvoiceCard invoice={invoice} key={invoice.id} />
            ))}
          </div>
          {invoices.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-muted">
              Create an invoice to populate this settlement dashboard.
            </div>
          ) : null}
        </section>
        </> : null}

        <section className="mt-10">
          <div className="mb-4">
            <h2 className="text-xl font-bold text-ink">Recent Transactions</h2>
            <p className="mt-1 text-sm text-muted">
              Paid invoice records confirmed by the Arc Testnet registry.
            </p>
          </div>
          <TransactionTable invoices={recentTransactions} />
        </section>
      </section>
    </main>
  );
}
