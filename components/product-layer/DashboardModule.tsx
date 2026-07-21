import { BarChart3 } from "lucide-react";
import { SettlementNode } from "./SettlementNode";

const metrics = [
  { label: "Total Received", value: "4,450 USDC" },
  { label: "Invoices", value: "7" },
  { label: "Volume", value: "+18%" }
] as const;

const bars = [44, 62, 52, 78, 68, 88, 74] as const;

export function DashboardModule() {
  return (
    <SettlementNode className="bg-[#fff1a8]/82" eyebrow="Module 05" icon={BarChart3} title="Settlement Dashboard">
      <div className="grid gap-3 sm:grid-cols-3">
        {metrics.map((metric) => (
          <div className="rounded-2xl bg-white/64 px-4 py-3" key={metric.label}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#667085]">{metric.label}</p>
            <p className="mt-2 text-xl font-black text-[#063f2c]">{metric.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 flex h-28 items-end gap-2 rounded-2xl border border-[#063f2c]/10 bg-white/54 px-4 py-4">
        {bars.map((height, index) => (
          <span
            className="sf-chart-bar flex-1 rounded-t-lg bg-[#063f2c]"
            key={`${height}-${index}`}
            style={{ height: `${height}%`, animationDelay: `${index * 120}ms` }}
          />
        ))}
      </div>
    </SettlementNode>
  );
}
