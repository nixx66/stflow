import { CircleDollarSign, Clock3, CreditCard, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/format";

export function DashboardStats({
  stats
}: {
  stats: {
    totalReceived: number;
    paidInvoices: number;
    pendingInvoices: number;
    totalVolume: number;
  };
}) {
  const items = [
    {
      label: "Total Received",
      value: formatCurrency(stats.totalReceived),
      icon: CircleDollarSign
    },
    { label: "Paid Invoices", value: stats.paidInvoices.toString(), icon: CreditCard },
    { label: "Pending Invoices", value: stats.pendingInvoices.toString(), icon: Clock3 },
    { label: "Total Volume", value: formatCurrency(stats.totalVolume), icon: TrendingUp }
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <article
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
            key={item.label}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted">{item.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-arc-50 text-arc-600">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-4 text-2xl font-bold text-ink">{item.value}</p>
          </article>
        );
      })}
    </div>
  );
}
