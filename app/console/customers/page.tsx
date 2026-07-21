import { DataPanel } from "@/components/console/DataPanel";
import { v2Customers } from "@/lib/v2MockData";

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

export default function ConsoleCustomersPage() {
  return (
    <DataPanel eyebrow="Customer management" title="Reusable payer and wallet profiles">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {v2Customers.map((customer) => (
          <article className="rounded-3xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:border-arc-100" key={customer.id}>
            <div className="flex items-center justify-between gap-3">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-arc-600">{customer.segment}</span>
              <span className="text-xs font-bold text-slate-400">{customer.id}</span>
            </div>
            <h2 className="mt-5 text-xl font-black text-ink">{customer.name}</h2>
            <p className="mt-2 text-sm font-semibold text-muted">{customer.email}</p>
            <div className="mt-5 rounded-2xl bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Wallet</p>
              <p className="mt-2 font-mono text-sm font-bold text-slate-700">{shortWallet(customer.wallet)}</p>
            </div>
            <p className="mt-5 text-3xl font-black text-ink">{customer.totalPaid.toLocaleString("en-US")} USDC</p>
            <p className="mt-1 text-sm font-bold text-muted">Total paid</p>
          </article>
        ))}
      </div>
    </DataPanel>
  );
}
