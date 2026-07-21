import { CheckCircle2, FileText, Network, Wallet } from "lucide-react";

const invoiceFacts = [
  { label: "Merchant wallet", value: "0xCEb5...509e", icon: Wallet },
  { label: "Network", value: "Testnet", icon: Network },
  { label: "Status", value: "Ready for settlement", icon: CheckCircle2 }
] as const;

export function InvoiceCore() {
  return (
    <article className="sf-core-engine relative overflow-hidden rounded-[2rem] border border-white/55 bg-white/65 p-6 text-[#07111f] shadow-[0_30px_90px_rgba(4,41,31,0.18)] backdrop-blur-2xl lg:p-7">
      <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#a8ef72]/35 blur-3xl" />
      <div className="absolute -bottom-20 left-10 h-52 w-52 rounded-full bg-[#ffd85a]/25 blur-3xl" />

      <div className="relative z-10 flex items-start justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e7f8ec] text-[#063f2c] ring-1 ring-[#16a34a]/18">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#16a34a]">Invoice Core</p>
            <h3 className="mt-1 text-2xl font-black tracking-tight">Invoice #AF-1029</h3>
          </div>
        </div>
        <span className="rounded-full bg-[#dcfce7] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-[#063f2c]">
          Source object
        </span>
      </div>

      <div className="relative z-10 mt-8 rounded-[1.5rem] border border-[#16a34a]/18 bg-[#063f2c] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-[#ffd85a]">Amount</p>
        <p className="mt-2 text-5xl font-black tracking-tight">1,250 USDC</p>
      </div>

      <div className="relative z-10 mt-5 grid gap-3">
        {invoiceFacts.map((fact) => {
          const Icon = fact.icon;
          return (
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-[#e6e2d8] bg-white/68 px-4 py-3" key={fact.label}>
              <div className="flex items-center gap-3">
                <Icon className="h-4 w-4 text-[#16a34a]" />
                <span className="text-sm font-bold text-[#667085]">{fact.label}</span>
              </div>
              <span className="text-sm font-black text-[#07111f]">{fact.value}</span>
            </div>
          );
        })}
      </div>
    </article>
  );
}
