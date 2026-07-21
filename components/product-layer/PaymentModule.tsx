import { CheckCircle2, Link2, WalletCards } from "lucide-react";
import { SettlementNode } from "./SettlementNode";

export function PaymentModule() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <SettlementNode eyebrow="Module 02" icon={Link2} title="Payment Link">
        <p className="text-base font-semibold leading-7 text-[#667085]">Convert the invoice into a customer checkout link.</p>
        <div className="mt-5 rounded-2xl bg-[#f7f4ea] px-4 py-3 font-mono text-sm font-black text-[#063f2c]">
          pay.stflow.xyz/invoice/AF1029
        </div>
        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#dcfce7] px-3 py-2 text-xs font-black text-[#063f2c]">
          <CheckCircle2 className="h-4 w-4" />
          Ready to share
        </div>
      </SettlementNode>

      <SettlementNode className="bg-[#fffdf4]/80" eyebrow="Module 03" icon={WalletCards} title="USDC Checkout">
        <div className="space-y-3 text-sm font-bold text-[#667085]">
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
            <span>Wallet</span>
            <span className="font-black text-[#07111f]">0xCEb5...509e</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3">
            <span>Network</span>
            <span className="font-black text-[#063f2c]">Testnet</span>
          </div>
          <div className="flex items-center justify-between rounded-2xl bg-[#fff1a8] px-4 py-3">
            <span>Amount</span>
            <span className="font-black text-[#063f2c]">1,250 USDC</span>
          </div>
        </div>
        <button className="mt-5 w-full rounded-full bg-[#063f2c] px-5 py-3 text-sm font-black text-white transition hover:bg-[#04291f]">
          Confirm Payment
        </button>
      </SettlementNode>
    </div>
  );
}
