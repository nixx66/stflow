"use client";

import { ArrowRight, FileText, Link2, ReceiptText, WalletCards } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";

const posterStats = [
  ["Amount", "1,250.00 USDC"],
  ["Network", "Testnet"],
  ["Status", "Ready to pay"]
] as const;

const floatingModules = [
  ["Invoice", "Structured request", FileText],
  ["Link", "Shareable checkout", Link2],
  ["Pay", "USDC state", WalletCards],
  ["Receipt", "Proof record", ReceiptText]
] as const;

export function HeroSection() {
  const router = useRouter();

  function navigateTo(event: MouseEvent<HTMLAnchorElement>, href: string) {
    event.preventDefault();
    router.push(href);
  }

  return (
    <section className="relative overflow-hidden bg-[#f7fbf4] text-[#07111f]">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[48rem] bg-[radial-gradient(circle_at_50%_0%,rgba(185,255,122,0.32),transparent_42rem)]" />
      <div className="mx-auto flex min-h-[calc(118dvh-98px)] max-w-[1760px] flex-col px-4 pb-20 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pb-24 lg:pt-40 2xl:px-10">
        <div className="relative z-10 mx-auto max-w-6xl text-center">
          <h1 className="sf-hero-headline text-[clamp(3.9rem,8.2vw,9.35rem)] font-black leading-[0.92] tracking-normal text-[#07111f]">
            <span className="sf-hero-shiny sf-hero-shiny-ink block pb-1">Settle Web3</span>
            <span className="sf-hero-shiny sf-hero-shiny-green block pb-2">without chaos.</span>
          </h1>

          <p className="mx-auto mt-12 max-w-3xl text-xl font-semibold leading-9 text-[#5f6f65] sm:text-2xl">
            STFlow turns invoices, payment links, USDC states, receipts, and settlement records into one clean operating flow.
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              className="sf-button-shine inline-flex h-14 min-w-48 items-center justify-center rounded-full bg-[#9cef6e] px-8 text-base font-black text-[#062016] shadow-[0_24px_70px_rgba(132,224,91,0.3)] transition hover:-translate-y-0.5 hover:bg-[#b9ff7a]"
              href="/invoice/new"
              onClick={(event) => navigateTo(event, "/invoice/new")}
            >
              Create Invoice
            </Link>
            <Link
              className="inline-flex h-14 min-w-48 items-center justify-center gap-2 rounded-full border border-[#cfe8ca] bg-white px-8 text-base font-black text-[#063f2c] shadow-[0_18px_50px_rgba(4,41,31,0.06)] transition hover:-translate-y-0.5 hover:border-[#9fe78f]"
              href="/console"
              onClick={(event) => navigateTo(event, "/console")}
            >
              Open Console
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="relative z-10 mt-24 flex-1">
          <div className="sf-invoice-showcase relative min-h-[46rem] overflow-hidden rounded-[2.5rem] border border-white/70 bg-[#c9f3b4] shadow-[0_48px_140px_rgba(55,116,67,0.16)] sm:rounded-[3.5rem] lg:min-h-[clamp(54rem,62vw,64rem)]">
            <Image
              alt=""
              aria-hidden="true"
              className="sf-invoice-scene pointer-events-none absolute inset-0 h-full w-full object-cover"
              fill
              priority
              sizes="(max-width: 1760px) 100vw, 1760px"
              src="/stflow-invoice-flow-mint.webp"
            />
            <div className="sf-invoice-wash pointer-events-none absolute inset-0" />

            <div className="relative z-10 grid min-h-[46rem] gap-12 px-6 py-14 sm:px-10 sm:py-16 lg:min-h-[clamp(54rem,62vw,64rem)] lg:grid-cols-[0.44fr_0.56fr] lg:items-center lg:px-16 lg:py-20 2xl:px-20">
              <div className="flex max-w-2xl flex-col justify-end self-end pb-4 lg:pb-12">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-[#43a63f]">Live settlement poster</p>
                <h2 className="mt-5 text-[clamp(2.45rem,10.5vw,3.2rem)] font-black leading-[0.91] tracking-[-0.055em] text-[#07111f] sm:text-[clamp(3.2rem,3.75vw,4.7rem)]">
                  One invoice becomes every operational state.
                </h2>
                <p className="mt-7 max-w-xl text-lg font-semibold leading-8 text-[#52655a] sm:text-xl">
                  STFlow transforms a single invoice into a real-time lifecycle of payment, settlement, and reconciliation.
                </p>
              </div>

              <div className="relative flex min-h-[30rem] flex-col items-center justify-center lg:min-h-[42rem] lg:flex-row">
                <div className="sf-invoice-glass-stack relative w-full max-w-[41rem]">
                  <div aria-hidden="true" className="sf-invoice-glass-layer sf-invoice-glass-layer-back" />
                  <div aria-hidden="true" className="sf-invoice-glass-layer sf-invoice-glass-layer-mid" />
                  <div className="sf-invoice-glass relative z-10 rounded-[2.4rem] p-5 text-[#07111f] sm:p-7">
                    <div className="flex items-start justify-between gap-5">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#65776b] sm:text-sm">Invoice AF-1029</p>
                        <p className="mt-4 text-[clamp(3.4rem,6vw,6rem)] font-black leading-none tracking-[-0.055em]">1,250.00</p>
                        <p className="mt-2 text-xl font-black text-[#0b8f58] sm:text-2xl">USDC</p>
                      </div>
                      <span className="rounded-full border border-white/80 bg-white/55 px-4 py-2 text-sm font-black text-[#063f2c] shadow-[0_12px_30px_rgba(28,108,62,0.08)] backdrop-blur-xl">Paid</span>
                    </div>
                    <div className="mt-8 grid gap-3 sm:mt-10">
                      {posterStats.map(([label, value]) => (
                        <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/70 bg-white/40 px-4 py-3.5 backdrop-blur-xl sm:px-5" key={label}>
                          <span className="font-bold text-[#637569]">{label}</span>
                          <span className="text-right font-black text-[#063f2c]">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="sf-invoice-modules absolute inset-0 z-20">
                  {floatingModules.map(([label, value, Icon], index) => (
                    <div className={`sf-invoice-module sf-invoice-module-${index + 1}`} key={label}>
                      <Icon className="h-5 w-5 shrink-0 text-[#0b8f58]" />
                      <div>
                        <p className="text-sm font-black text-[#062016]">{label}</p>
                        <p className="text-xs font-bold text-[#667085]">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
