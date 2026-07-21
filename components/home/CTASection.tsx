import { ArrowRight } from "lucide-react";
import Link from "next/link";

export function CTASection() {
  return (
    <section className="bg-[#f7fbf4] px-4 py-10 sm:px-6 lg:px-8 lg:pb-20 2xl:px-10">
      <div className="mx-auto grid min-h-[520px] max-w-[1760px] gap-10 rounded-[3.5rem] bg-[#063f2c] px-6 py-16 text-white sm:px-10 lg:grid-cols-[0.62fr_0.38fr] lg:items-center lg:px-16 lg:py-20 2xl:px-20">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.22em] text-[#8fde68]">STFlow</p>
          <h2 className="mt-6 max-w-5xl text-[clamp(3.2rem,6.4vw,7.6rem)] font-black leading-[0.88] tracking-[-0.055em]">
            Start with one invoice. Keep the whole flow clean.
          </h2>
        </div>

        <div className="rounded-[2.5rem] border border-white/10 bg-white/[0.08] p-6 backdrop-blur">
          <p className="text-xl font-semibold leading-8 text-white/72">
            Use the mock flow now, keep the interface ready for real settlement later.
          </p>
          <div className="mt-8 grid gap-3">
            <Link
              className="sf-button-shine inline-flex h-14 items-center justify-center gap-2 rounded-full bg-[#8fde68] px-8 text-base font-black text-[#062016] transition hover:-translate-y-0.5 hover:bg-white"
              href="/invoice/new"
            >
              Create Invoice
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              className="inline-flex h-14 items-center justify-center rounded-full border border-white/18 bg-white/10 px-8 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-white/16"
              href="/console"
            >
              Open Console
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
