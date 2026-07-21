import { ExternalLink, ShieldCheck } from "lucide-react";

const proofItems = [
  { label: "Tx Hash", value: "0x7e2a...91b4" },
  { label: "Explorer Link", value: "Scan ready" },
  { label: "Receipt Proof", value: "Verified" },
  { label: "Audit Trail", value: "5 events synced" }
] as const;

export function ProofLayer() {
  return (
    <article className="sf-system-node relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#07111f] p-6 text-white shadow-[0_28px_90px_rgba(4,41,31,0.18)] lg:p-7">
      <div className="sf-moss absolute inset-y-6 right-8 w-1/2 rounded-[2rem] opacity-30 blur-2xl" />
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-5">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#a8ef72]/12 text-[#a8ef72] ring-1 ring-[#a8ef72]/24">
            <ShieldCheck className="h-6 w-6" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#a8ef72]">Module 06</p>
            <h3 className="mt-1 text-3xl font-black tracking-tight">On-chain verification layer</h3>
          </div>
        </div>
        <div className="sf-verify-pulse rounded-full bg-[#dcfce7] px-4 py-2 text-sm font-black text-[#063f2c]">Verified</div>
      </div>

      <div className="relative z-10 mt-7 grid gap-3 md:grid-cols-4">
        {proofItems.map((item) => (
          <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-4 backdrop-blur" key={item.label}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-white/48">{item.label}</p>
            <p className="mt-2 font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="relative z-10 mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-[#a8ef72]">
        Open proof trail
        <ExternalLink className="h-4 w-4" />
      </div>
    </article>
  );
}
