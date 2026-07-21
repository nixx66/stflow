import { Building2, Code2, Landmark, UsersRound } from "lucide-react";

const useCases = [
  ["Web3 builders", "Milestone deposits, testnet demos, and productized payment flows.", Code2],
  ["Service studios", "Retainers, implementation work, delivery phases, and proof-ready receipts.", Building2],
  ["DAO operations", "Contributor invoices and payment history without spreadsheet drift.", UsersRound],
  ["Treasury teams", "USDC requests, status review, and settlement history in one operating view.", Landmark]
] as const;

export function UseCasesSection() {
  return (
    <section className="relative overflow-hidden bg-[#f7fbf2] py-24 lg:py-32" id="use-cases">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#bfeeb8] to-transparent" />
      <div className="mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
        <div className="mb-14 grid gap-8 lg:grid-cols-[0.48fr_0.52fr] lg:items-end">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0b8f58]">Use cases</p>
            <h2 className="mt-5 text-5xl font-black leading-[0.98] tracking-[-0.035em] text-[#07111f] sm:text-7xl">
              Built for teams that treat tasks like financial events.
            </h2>
          </div>
          <p className="max-w-3xl text-xl font-semibold leading-9 text-[#667085]">
            STFlow is intentionally calm: enough structure for operators, enough flexibility for Web3 work.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {useCases.map(([title, copy, Icon], index) => (
            <article
              className={`group min-h-[24rem] rounded-[2.6rem] border p-7 shadow-[0_28px_90px_rgba(4,41,31,0.06)] transition duration-200 hover:-translate-y-1 ${
                index === 0
                  ? "border-[#113828] bg-[#063f2c] text-white"
                  : "border-[#dcebd8] bg-white/[0.78] text-[#07111f] backdrop-blur"
              }`}
              key={title}
            >
              <div className="flex items-center justify-between gap-5">
                <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${index === 0 ? "bg-white/10 text-[#b9ff7a]" : "bg-[#e7f8ec] text-[#0b8f58]"}`}>
                  <Icon className="h-7 w-7" />
                </span>
                <span className={`text-5xl font-black tracking-[-0.05em] ${index === 0 ? "text-white/16" : "text-[#063f2c]/12"}`}>
                  0{index + 1}
                </span>
              </div>
              <h3 className={`mt-20 text-3xl font-black tracking-[-0.03em] ${index === 0 ? "text-white" : "text-[#063f2c]"}`}>{title}</h3>
              <p className={`mt-4 text-base font-semibold leading-7 ${index === 0 ? "text-white/64" : "text-[#667085]"}`}>{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
