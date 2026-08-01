"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { ConsoleLoadState } from "@/components/console/ConsoleLoadState";
import { DataPanel } from "@/components/console/DataPanel";
import { useInvoices } from "@/hooks/useInvoice";
import { invoiceAnalytics } from "@/lib/consoleViews";
import { formatCurrency } from "@/lib/format";

export default function AnalyticsPage() {
  const { address } = useAccount();
  const { invoices, status, refresh } = useInvoices();
  const analytics = useMemo(() => invoiceAnalytics(invoices, address), [address, invoices]);

  if (status !== "ready" && status !== "partial") {
    return <ConsoleLoadState refresh={refresh} status={status} title="Invoice analytics" />;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-arc-600">Measured from chain data</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-ink">Invoice analytics</h2>
        <p className="mt-3 max-w-3xl font-semibold leading-7 text-muted">No sample metrics: every value below is calculated from the connected wallet&apos;s Arc Testnet ledger.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          ["Invoices", analytics.totalInvoices.toString()],
          ["Receivable volume", formatCurrency(analytics.receivableAmount)],
          ["Payable volume", formatCurrency(analytics.payableAmount)]
        ].map(([label, value]) => (
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card" key={label}>
            <p className="text-sm font-bold text-muted">{label}</p><p className="mt-2 text-3xl font-black text-ink">{value}</p>
          </div>
        ))}
      </section>

      <DataPanel eyebrow="Status distribution" title="Lifecycle totals">
        <div className="grid gap-4 md:grid-cols-2">
          {Object.entries(analytics.status).map(([name, row]) => (
            <article className="rounded-2xl border border-slate-100 bg-slate-50 p-5" key={name}>
              <div className="flex items-center justify-between"><p className="font-black capitalize text-ink">{name}</p><p className="text-2xl font-black text-ink">{row.count}</p></div>
              <p className="mt-3 text-sm font-bold text-muted">{formatCurrency(row.amount)}</p>
            </article>
          ))}
        </div>
      </DataPanel>
    </div>
  );
}
