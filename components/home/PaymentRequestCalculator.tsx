import { ArrowRight, CheckCircle2, Link2, ReceiptText, WalletCards } from "lucide-react";

const outputs = [
  ["Payment link", "pay/stflow-af1001", Link2],
  ["Receipt", "Proof page reserved", ReceiptText],
  ["Dashboard record", "Pending settlement", CheckCircle2]
] as const;

export function PaymentRequestCalculator() {
  return (
    <section className="sf-reveal border-b border-[#d8e8d3] bg-[#f7fbf4] py-16 lg:py-24">
      <div className="mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="grid overflow-hidden rounded-[2.5rem] border border-[#d8e8d3] bg-[#fbfff8] shadow-[0_30px_90px_rgba(4,41,31,0.08)] lg:grid-cols-[0.48fr_0.52fr]">
          <div className="relative overflow-hidden bg-[#063f2c] p-7 text-white sm:p-10 lg:p-14">
            <div className="sf-noise absolute inset-0 opacity-25" />
            <div className="sf-moss absolute -bottom-36 -right-24 h-96 w-96 rounded-full opacity-60 blur-xl" />
            <div className="relative z-10">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-[#a8ef72]">Payment request calculator</p>
              <h2 className="mt-5 max-w-2xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">
                Build the request like a financial operation.
              </h2>
              <p className="mt-6 max-w-xl text-lg font-semibold leading-8 text-white/68">
                Amount, payer, and merchant wallet are the primary inputs. STFlow turns them into a link, receipt, and dashboard record.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            <div className="rounded-[2rem] border border-[#d8e8d3] bg-[#f1f8ec] p-5">
              <p className="text-sm font-black uppercase tracking-[0.14em] text-[#667085]">Amount</p>
              <div className="mt-4 flex items-center justify-between gap-4 rounded-[1.6rem] bg-[#eaf6e3] px-5 py-6">
                <span className="text-5xl font-black tracking-tight text-[#063f2c] sm:text-6xl">1,250.00</span>
                <span className="rounded-full bg-[#063f2c] px-5 py-3 text-base font-black text-white">
                  USDC
                </span>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.7rem] border border-[#d8e8d3] bg-[#fbfff8] p-5">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-muted">Payer</p>
                <p className="mt-4 text-2xl font-black text-ink">Builder team</p>
              </div>
              <div className="rounded-[1.7rem] border border-[#d8e8d3] bg-[#fbfff8] p-5">
                <p className="text-sm font-black uppercase tracking-[0.14em] text-muted">Merchant wallet</p>
                <p className="mt-4 font-mono text-xl font-black text-ink">0xCEb5...509e</p>
              </div>
            </div>

            <div className="mt-5 rounded-[2rem] border border-[#d8e8d3] bg-[#fbfff8] p-5">
              <div className="flex items-center gap-3">
                <WalletCards className="h-6 w-6 text-[#0fa86b]" />
                <p className="text-sm font-black uppercase tracking-[0.16em] text-[#0fa86b]">Result</p>
              </div>
              <h3 className="mt-4 text-3xl font-black tracking-tight text-[#07111f]">One request becomes three operating records.</h3>

              <div className="mt-6 grid gap-3">
                {outputs.map(([label, value, Icon], index) => (
                  <div
                    className="group rounded-[1.35rem] border border-[#d8e8d3] bg-[#f1f8ec] p-4 transition hover:-translate-y-0.5 hover:bg-[#eaf6e3]"
                    key={label}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#063f2c] text-sm font-black text-white">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-black text-[#07111f]">{label}</p>
                          <p className="mt-1 text-sm font-semibold text-muted">{value}</p>
                        </div>
                      </div>
                      <Icon className="h-5 w-5 text-[#0fa86b]" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex items-center justify-between rounded-full bg-[#063f2c] px-5 py-4 text-white">
                <span className="font-black">Generate payment link</span>
                <ArrowRight className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
