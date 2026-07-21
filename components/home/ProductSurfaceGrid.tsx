import { ArrowRight, CheckCircle2, FileText, Link2, ReceiptText } from "lucide-react";
import Link from "next/link";

const proofPoints = [
  ["Invoice", "Create a structured request with amount, payer, memo, and settlement context.", FileText],
  ["Checkout Link", "Share one clean URL that keeps the payer focused on the payment action.", Link2],
  ["Receipt Record", "Turn the payment state into a formal receipt and audit-ready object.", ReceiptText]
] as const;

export function ProductSurfaceGrid() {
  return (
    <section className="relative overflow-hidden bg-[#f7fbf4] px-4 py-10 sm:px-6 lg:px-8 2xl:px-10" id="product">
      <div className="mx-auto max-w-[1760px] overflow-hidden rounded-[3.5rem] bg-[#8fde68]">
        <div className="grid min-h-[760px] gap-12 px-6 py-16 sm:px-10 lg:grid-cols-[0.46fr_0.54fr] lg:items-center lg:px-16 lg:py-24 2xl:px-20">
          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#113a19]">Product</p>
            <h2 className="mt-6 text-[clamp(3.4rem,6.6vw,8rem)] font-black leading-[0.88] tracking-[-0.055em] text-[#09230f]">
              Web3 settlement, cleaned up.
            </h2>
            <p className="mt-8 max-w-xl text-2xl font-semibold leading-10 text-[#173a1c]/78">
              STFlow gives teams one calm place to create requests, send links, track USDC status, and reconcile proof.
            </p>
            <Link
              className="mt-10 inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#09230f] px-8 text-base font-black text-[#b9ff7a] transition hover:-translate-y-0.5 hover:bg-[#063f2c]"
              href="/invoice/new"
            >
              Create a payment request
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="relative">
            <div className="absolute -left-10 top-12 hidden h-64 w-64 rounded-full bg-white/28 blur-3xl lg:block" />
            <div className="relative mx-auto max-w-[660px] rounded-[3rem] bg-[#fbfff8] p-6 shadow-[0_44px_120px_rgba(10,66,25,0.2)] sm:p-8">
              <div className="flex items-center justify-between gap-5">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.16em] text-[#70816c]">Payment request</p>
                  <h3 className="mt-3 text-4xl font-black tracking-[-0.035em] text-[#07111f]">Invoice AF-1029</h3>
                </div>
                <span className="rounded-full bg-[#e7f8ec] px-4 py-2 text-sm font-black text-[#063f2c]">Ready</span>
              </div>

              <div className="mt-10 rounded-[2.2rem] bg-[#f6fbf2] p-6">
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#70816c]">Amount due</p>
                <p className="mt-3 text-[clamp(4rem,7vw,6.8rem)] font-black leading-none tracking-[-0.06em] text-[#09230f]">1,250</p>
                <p className="mt-2 text-2xl font-black text-[#0b8f58]">USDC</p>
              </div>

              <div className="mt-6 grid gap-4">
                {proofPoints.map(([title, copy, Icon]) => (
                  <div className="grid gap-4 rounded-[2rem] border border-[#d8e8d3] p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center" key={title}>
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#e7f8ec] text-[#0b8f58]">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-xl font-black tracking-[-0.02em] text-[#063f2c]">{title}</p>
                      <p className="mt-1 max-w-md text-sm font-semibold leading-6 text-[#667085]">{copy}</p>
                    </div>
                    <CheckCircle2 className="hidden h-6 w-6 text-[#0b8f58] sm:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
