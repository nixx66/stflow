import { BarChart3, QrCode, ReceiptText, TrendingUp } from "lucide-react";
import { DataPanel } from "@/components/console/DataPanel";
import { MetricTile } from "@/components/console/MetricTile";
import { getV2Analytics, getV2ConsoleSummary } from "@/lib/v2MockData";

export default function ConsoleAnalyticsPage() {
  const analytics = getV2Analytics();
  const summary = getV2ConsoleSummary();

  const bars = [
    ["Paid", summary.statusCounts.paid, "bg-arc-600"],
    ["Pending", summary.statusCounts.pending, "bg-amber-500"],
    ["Draft", summary.statusCounts.draft, "bg-slate-400"],
    ["Closed", summary.statusCounts.archived, "bg-slate-300"]
  ] as const;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricTile label="Success rate" value={`${analytics.successRate}%`} helper="Paid invoices against active payable invoices" icon={<TrendingUp className="h-5 w-5" />} />
        <MetricTile label="Average paid invoice" value={`${analytics.averagePaidInvoice.toLocaleString("en-US")} USDC`} helper="Paid invoice average" icon={<BarChart3 className="h-5 w-5" />} />
        <MetricTile label="QR coverage" value={`${analytics.qrEnabledInvoices}`} helper="Invoices with QR payment enabled" icon={<QrCode className="h-5 w-5" />} />
        <MetricTile label="Receipt coverage" value={`${analytics.pdfReadyReceipts}`} helper="PDF receipt ready invoices" icon={<ReceiptText className="h-5 w-5" />} />
      </section>

      <DataPanel eyebrow="Analytics" title="Invoice status distribution">
        <div className="space-y-5">
          {bars.map(([label, count, color]) => {
            const width = Math.max(8, Math.round((count / summary.totalInvoices) * 100));
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-sm font-black text-slate-700">
                  <span>{label}</span>
                  <span>{count} invoices</span>
                </div>
                <div className="mt-2 h-3 rounded-full bg-slate-100">
                  <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </DataPanel>

      <DataPanel eyebrow="Top customer" title="Revenue concentration">
        <div className="rounded-3xl bg-ink p-6 text-white">
          <p className="text-sm font-bold text-arc-100">Highest paid customer</p>
          <p className="mt-3 text-4xl font-black tracking-tight">{analytics.topCustomer.name}</p>
          <p className="mt-4 text-2xl font-black text-arc-100">{analytics.topCustomer.totalPaid.toLocaleString("en-US")} USDC</p>
        </div>
      </DataPanel>
    </div>
  );
}
