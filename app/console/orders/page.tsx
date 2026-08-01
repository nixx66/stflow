"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { ConsoleLoadState } from "@/components/console/ConsoleLoadState";
import { DataPanel } from "@/components/console/DataPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { useInvoices } from "@/hooks/useInvoice";
import { orderRows } from "@/lib/consoleViews";
import { formatCurrency, formatDate, shortenAddress } from "@/lib/format";

export default function OrdersPage() {
  const { address } = useAccount();
  const { invoices, status, refresh } = useInvoices();
  const orders = useMemo(() => orderRows(invoices, address), [address, invoices]);

  if (status !== "ready" && status !== "partial") {
    return <ConsoleLoadState refresh={refresh} status={status} title="Settlement orders" />;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-arc-600">Operational ledger</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-ink">Settlement orders</h2>
        <p className="mt-3 max-w-3xl font-semibold leading-7 text-muted">
          Every order maps to one onchain invoice and keeps the connected wallet&apos;s receivable or payable role explicit.
        </p>
      </header>

      <DataPanel eyebrow="Arc Testnet" title={`${orders.length} settlement orders`}>
        {orders.length ? (
          <div className="space-y-3">
            {orders.map(({ invoice, direction, counterparty }) => (
              <article className="grid gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-5 md:grid-cols-[1fr_auto_auto] md:items-center" key={invoice.id}>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-black text-ink">{invoice.title || `Invoice ${invoice.id.slice(0, 10)}`}</p>
                    <StatusBadge status={invoice.status} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-muted">{direction} · {shortenAddress(counterparty, 6)} · {formatDate(invoice.createdAt)}</p>
                </div>
                <p className="font-black text-ink">{formatCurrency(invoice.amount, invoice.currency)}</p>
                <Link className="font-black text-arc-700 underline" href={`/console/invoices/${encodeURIComponent(invoice.id)}`}>Open</Link>
              </article>
            ))}
          </div>
        ) : <p className="py-8 text-center font-bold text-muted">No settlement orders found for this wallet.</p>}
      </DataPanel>
    </div>
  );
}
