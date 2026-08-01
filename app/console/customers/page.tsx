"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { ConsoleLoadState } from "@/components/console/ConsoleLoadState";
import { DataPanel } from "@/components/console/DataPanel";
import { useInvoices } from "@/hooks/useInvoice";
import { customerRows } from "@/lib/consoleViews";
import { formatCurrency, shortenAddress } from "@/lib/format";

export default function CustomersPage() {
  const { address } = useAccount();
  const { invoices, status, refresh } = useInvoices();
  const customers = useMemo(() => customerRows(invoices, address), [address, invoices]);

  if (status !== "ready" && status !== "partial") {
    return <ConsoleLoadState refresh={refresh} status={status} title="Customer directory" />;
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-arc-600">Counterparties</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-ink">Customer directory</h2>
        <p className="mt-3 max-w-3xl font-semibold leading-7 text-muted">
          Wallets are grouped from your real Arc Testnet invoice history. Names only appear when supplied in verified invoice metadata.
        </p>
      </header>

      <DataPanel eyebrow="Wallet scoped" title={`${customers.length} counterparties`}>
        {customers.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {customers.map((customer) => (
              <article className="rounded-2xl border border-slate-100 bg-slate-50 p-5" key={customer.wallet}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-black text-ink">{customer.name || shortenAddress(customer.wallet, 6)}</p>
                    <p className="mt-1 break-all font-mono text-xs font-bold text-muted">{customer.wallet}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black uppercase text-arc-700">
                    {customer.relationship}
                  </span>
                </div>
                <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                  <div><p className="font-black text-ink">{customer.invoiceCount}</p><p className="text-muted">Invoices</p></div>
                  <div><p className="font-black text-ink">{formatCurrency(customer.pendingAmount)}</p><p className="text-muted">Pending</p></div>
                  <div><p className="font-black text-ink">{formatCurrency(customer.settledAmount)}</p><p className="text-muted">Settled</p></div>
                </div>
              </article>
            ))}
          </div>
        ) : <p className="py-8 text-center font-bold text-muted">No counterparties found for this wallet.</p>}
      </DataPanel>
    </div>
  );
}
