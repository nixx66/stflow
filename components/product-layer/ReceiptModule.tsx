import { CheckCircle2, Clock3, ReceiptText } from "lucide-react";
import { SettlementNode } from "./SettlementNode";

const receiptStates = ["Pending", "Confirming", "Verified"] as const;

export function ReceiptModule() {
  return (
    <SettlementNode className="bg-[#e7f8ec]/72" eyebrow="Module 04" icon={ReceiptText} title="Receipt + Proof">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl bg-white/74 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#667085]">Receipt ID</p>
          <p className="mt-2 font-black text-[#07111f]">RCPT-AF1029</p>
        </div>
        <div className="rounded-2xl bg-white/74 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#667085]">Tx hash</p>
          <p className="mt-2 font-mono text-sm font-black text-[#07111f]">0x7e2...91b</p>
        </div>
        <div className="rounded-2xl bg-white/74 px-4 py-3">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-[#667085]">Timestamp</p>
          <p className="mt-2 font-black text-[#07111f]">2026/07/14</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {receiptStates.map((state, index) => (
          <div className="sf-verify-step flex items-center gap-2 rounded-full border border-[#16a34a]/18 bg-white/70 px-4 py-2 text-sm font-black text-[#063f2c]" key={state} style={{ animationDelay: `${index * 520}ms` }}>
            {index === 2 ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}
            {state}
          </div>
        ))}
      </div>
    </SettlementNode>
  );
}
