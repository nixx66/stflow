import { CheckCircle2, ReceiptText, ShieldCheck } from "lucide-react";

const timeline = ["Request created", "Link opened", "Payment confirmed", "Receipt issued"] as const;

export function ReceiptAuditSection() {
  return (
    <section className="relative overflow-hidden bg-[#f7fbf4] px-4 py-10 sm:px-6 lg:px-8 2xl:px-10">
      <div className="mx-auto grid min-h-[760px] max-w-[1760px] gap-12 rounded-[3.5rem] bg-[#eaf6e3] px-6 py-16 sm:px-10 lg:grid-cols-[0.55fr_0.45fr] lg:items-center lg:px-16 lg:py-24 2xl:px-20">
        <div className="relative">
          <div className="absolute -left-12 -top-12 h-72 w-72 rounded-full bg-[#b9ff7a]/28 blur-3xl" />
          <div className="relative max-w-[720px] rounded-[3rem] border border-[#d8e8d3] bg-[#fbfff8] p-6 shadow-[0_34px_110px_rgba(4,41,31,0.08)] sm:p-8">
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0b8f58]">Receipt</p>
                <h3 className="mt-3 text-4xl font-black tracking-[-0.035em] text-[#07111f]">RCPT-AF-1001</h3>
              </div>
              <ReceiptText className="h-9 w-9 text-[#0b8f58]" />
            </div>

            <div className="mt-10 rounded-[2rem] bg-[#f1f8ec] p-6">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#70816c]">Paid amount</p>
              <p className="mt-3 text-6xl font-black tracking-[-0.055em] text-[#09230f]">1,250.00</p>
              <p className="mt-2 text-xl font-black text-[#0b8f58]">USDC</p>
            </div>

            <div className="mt-6 grid gap-3">
              {timeline.map((item) => (
                <div className="flex items-center justify-between rounded-2xl border border-[#e5efe2] px-5 py-4" key={item}>
                  <span className="font-black text-[#063f2c]">{item}</span>
                  <CheckCircle2 className="h-5 w-5 text-[#0b8f58]" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="max-w-2xl lg:justify-self-end">
          <div className="flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-[#e7f8ec] text-[#0b8f58]">
            <ShieldCheck className="h-8 w-8" />
          </div>
          <h2 className="mt-8 text-[clamp(3.2rem,6vw,7rem)] font-black leading-[0.9] tracking-[-0.05em] text-[#07111f]">
            Proof that still feels simple.
          </h2>
          <p className="mt-8 max-w-xl text-2xl font-semibold leading-10 text-[#5f6f65]">
            Receipts and audit fields stay readable, so the flow can move from prototype to real settlement without redesigning the product surface.
          </p>
        </div>
      </div>
    </section>
  );
}
