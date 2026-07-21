import { DataPanel } from "@/components/console/DataPanel";
import { getV2CustomerName, v2Orders } from "@/lib/v2MockData";

const orderStatusStyles = {
  fulfilled: "bg-emerald-50 text-emerald-700",
  open: "bg-amber-50 text-amber-700",
  cancelled: "bg-slate-100 text-slate-500"
};

export default function ConsoleOrdersPage() {
  return (
    <DataPanel eyebrow="Product and order management" title="Order objects linked to invoices">
      <div className="grid gap-4 lg:grid-cols-2">
        {v2Orders.map((order) => (
          <article className="rounded-3xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-arc-100" key={order.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{order.id}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-black ${orderStatusStyles[order.status]}`}>{order.status}</span>
            </div>
            <h2 className="mt-4 text-2xl font-black tracking-tight text-ink">{order.title}</h2>
            <p className="mt-2 text-sm font-bold text-muted">{getV2CustomerName(order.customerId)}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Category</p>
                <p className="mt-2 font-black text-ink">{order.category}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Amount</p>
                <p className="mt-2 font-black text-ink">{order.amount.toLocaleString("en-US")} {order.currency}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </DataPanel>
  );
}
