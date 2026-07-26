import { Activity, ArrowRight, BarChart3, CircleDollarSign, FileCheck2, RadioTower, ScanLine, ShieldCheck } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { getMetricValueSize } from "@/lib/metric-value-size";

const metrics = [
  { label: "Volume", value: "4,450", unit: "USDC", icon: CircleDollarSign, tone: "Received this cycle", delta: "+12.6%" },
  { label: "Success rate", value: "98.4", unit: "%", icon: FileCheck2, tone: "Settlement reliability", delta: "+1.8%" },
  { label: "Active links", value: "12", unit: "live", icon: Activity, tone: "Checkout objects", delta: "+4" },
  { label: "Avg speed", value: "42", unit: "sec", icon: BarChart3, tone: "Median confirmation", delta: "-8 sec" }
] as const;

const activity = [
  ["AF-1029", "Payment received", "1,250 USDC", "Settled"],
  ["AF-1030", "Checkout link opened", "890 USDC", "Pending"],
  ["AF-1031", "Receipt issued", "420 USDC", "Paid"]
] as const;

const rollingDigits = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
const rollingLoopDigits = [...rollingDigits, ...rollingDigits];
const operatingAreas = ["Receivables", "Payables", "Receipts", "Audit trail"] as const;
const settlementWindowHeights = [42, 68, 54, 86, 61, 92, 74, 98] as const;

function RollingValue({ value }: { value: string }) {
  const size = getMetricValueSize(value);

  return (
    <span className={`sf-roll-value sf-roll-value--${size}`} aria-label={value}>
      {value.split("").map((character, index) => {
        const key = `${character}-${index}`;

        if (!/\d/.test(character)) {
          return (
            <span className="sf-roll-mark" aria-hidden="true" key={key}>
              {character}
            </span>
          );
        }

        return (
          <span
            className="sf-roll-window"
            aria-hidden="true"
            key={key}
            style={
              {
                "--roll-delay": `${index * 85}ms`,
                "--roll-target": `-${Number(character)}em`
              } as CSSProperties
            }
          >
            <span className="sf-roll-strip">
              {rollingLoopDigits.map((digit, digitIndex) => (
                <span key={`${digit}-${digitIndex}`}>{digit}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function DashboardPreview() {
  return (
    <section className="relative overflow-hidden bg-[#f7fbf4] px-4 py-14 sm:px-6 lg:px-8 2xl:px-10" id="dashboard">
      <div className="sf-dashboard-field mx-auto grid min-h-[980px] max-w-[1760px] gap-12 overflow-hidden rounded-[3.5rem] bg-[#f1f8ec] px-6 py-20 shadow-[inset_0_0_0_1px_rgba(216,232,211,0.95)] sm:px-10 lg:grid-cols-[0.38fr_0.62fr] lg:items-center lg:px-16 lg:py-28 2xl:px-20">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0b8f58]">Dashboard</p>
          <h2 className="mt-6 text-[clamp(3.2rem,6.1vw,7.2rem)] font-black leading-[0.9] tracking-[-0.055em] text-[#07111f]">
            Numbers first. Noise last.
          </h2>
          <p className="mt-8 max-w-xl text-2xl font-semibold leading-10 text-[#5f6f65]">
            A clean settlement dashboard for volume, links, payment states, and receipts. Built for operators who need signal at a glance.
          </p>
          <Link
            className="mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#063f2c] px-8 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-[#09230f]"
            href="/dashboard"
          >
            Open full dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
          <div className="mt-14 grid max-w-xl gap-3 sm:grid-cols-2">
            {operatingAreas.map((item, index) => (
              <div className="rounded-[1.4rem] border border-[#d8e8d3] bg-[#fbfff8]/80 px-5 py-4 shadow-[0_18px_50px_rgba(4,41,31,0.04)]" key={item}>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#9aa797]">0{index + 1}</p>
                <p className="mt-2 font-black text-[#063f2c]">{item}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -right-10 -top-10 h-72 w-72 rounded-full bg-[#b9ff7a]/32 blur-3xl" />
          <div className="sf-dashboard-console relative overflow-hidden rounded-[3rem] border border-[#d8e8d3] bg-[#fbfff8] p-5 shadow-[0_44px_130px_rgba(4,41,31,0.1)] sm:p-7">
            <div className="flex flex-col gap-5 border-b border-[#e3eedf] pb-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-[#0b8f58]">
                  <RadioTower className="h-4 w-4" />
                  Live settlement desk
                </div>
                <h3 className="mt-3 text-[clamp(2.2rem,4vw,4.8rem)] font-black leading-none tracking-[-0.055em] text-[#07111f]">
                  Settlement console
                </h3>
              </div>
              <div className="flex w-fit items-center gap-2 rounded-full bg-[#e7f8ec] px-4 py-2 text-sm font-black text-[#063f2c]">
                <span className="h-2 w-2 rounded-full bg-[#10b981] shadow-[0_0_0_6px_rgba(16,185,129,0.12)]" />
                Network ready
              </div>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {metrics.map(({ label, value, unit, icon: Icon, tone, delta }) => (
                <article className="sf-market-tile rounded-[2rem] p-5" key={label}>
                  <div className="flex items-center justify-between">
                    <Icon className="h-6 w-6 text-[#0b8f58]" />
                    <span className="sf-market-delta rounded-full px-2.5 py-1 text-[0.65rem] font-black uppercase tracking-[0.12em] text-[#063f2c]">
                      {delta}
                    </span>
                  </div>
                  <p className="mt-7 text-xs font-black uppercase tracking-[0.16em] text-[#70816c]">{label}</p>
                  <p className="mt-3 text-[#09230f]">
                    <RollingValue value={value} />
                  </p>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <p className="text-sm font-black text-[#0b8f58]">{unit}</p>
                    <p className="max-w-28 text-right text-[0.72rem] font-bold leading-4 text-[#81907d]">{tone}</p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-5 xl:grid-cols-[1.08fr_0.92fr]">
              <div className="sf-rhythm-panel relative overflow-hidden rounded-[2.25rem] bg-[#063f2c] p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xl font-black">Flow rhythm</p>
                    <p className="mt-1 text-sm font-semibold text-white/55">Last 8 settlement windows</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-2 text-xs font-black text-[#b9ff7a]">
                    <ScanLine className="h-4 w-4" />
                    Scanning
                  </div>
                </div>
                <div className="relative mt-10 flex h-72 items-end gap-3">
                  <div className="sf-scan-line" />
                  {settlementWindowHeights.map((height, index) => (
                    <div className="flex flex-1 flex-col items-center gap-3" key={`${height}-${index}`}>
                      <div
                        className="sf-chart-bar w-full rounded-t-2xl bg-gradient-to-t from-[#20a867] to-[#b9ff7a]"
                        style={{ height: `${height}%`, animationDelay: `${index * 120}ms` }}
                      />
                      <span className="text-xs font-bold text-white/36">{index + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-hidden rounded-[2.25rem] border border-[#d8e8d3] bg-[#fbfff8]">
                <div className="flex items-center justify-between bg-[#f5fbf1] px-5 py-4">
                  <p className="text-lg font-black text-[#063f2c]">Recent activity</p>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#0b8f58]">Live feed</span>
                </div>
                <div className="divide-y divide-[#edf3ea] bg-[#fbfff8]">
                  {activity.map(([id, label, amount, status]) => (
                    <div className="grid gap-3 px-5 py-5 sm:grid-cols-[0.8fr_1.2fr_1fr_auto] sm:items-center" key={id}>
                      <p className="font-black text-[#07111f]">{id}</p>
                      <p className="font-semibold text-[#667085]">{label}</p>
                      <p className="font-black text-[#063f2c]">{amount}</p>
                      <span className="w-fit rounded-full bg-[#e7f8ec] px-3 py-1 text-xs font-black text-[#063f2c]">{status}</span>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 border-t border-[#edf3ea] bg-[#f1f8ec]">
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#70816c]">
                      <ShieldCheck className="h-4 w-4 text-[#0b8f58]" />
                      Proof layer
                    </div>
                    <p className="mt-3 font-black text-[#07111f]">Receipts indexed</p>
                  </div>
                  <div className="border-l border-[#edf3ea] p-5">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-[#70816c]">
                      <Activity className="h-4 w-4 text-[#0b8f58]" />
                      State sync
                    </div>
                    <p className="mt-3 font-black text-[#07111f]">Ready to reconcile</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
