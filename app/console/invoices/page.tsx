"use client";

import { ArrowDownLeft, ArrowUpRight, WalletCards } from "lucide-react";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { DataPanel } from "@/components/console/DataPanel";
import { InvoiceRows } from "@/components/console/InvoiceRows";
import { useInvoices } from "@/hooks/useInvoice";
import { getConsoleInvoiceData, getConsoleWalletScope } from "@/lib/consoleInvoiceData";
import { formatCurrency, shortenAddress } from "@/lib/format";

export default function ConsoleInvoicesPage() {
  const { address } = useAccount();
  const { invoices, isReady, error, refresh } = useInvoices();
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
            This workspace reads contract state from Arc Testnet and verifies descriptive metadata against its onchain hash.
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
          {!walletScope.wallet ? (
            <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              Connect a wallet to load its Arc Testnet invoices.
            </p>
          ) : null}
          {walletScope.wallet && !isReady ? (
            <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-muted">
              Loading Arc Testnet invoice ledger...
            </p>
          ) : null}
          {error ? (
            <p className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
              {error}{" "}<button className="underline" onClick={() => void refresh()} type="button">Retry</button>
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
                "Verified chain ledger",
                "The console reads Arc Testnet contract state and hash-verified metadata.",
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
        action={<span className="font-mono text-xs font-bold text-muted">{walletScope.wallet ? shortenAddress(walletScope.wallet, 6) : "Not connected"}</span>}
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
