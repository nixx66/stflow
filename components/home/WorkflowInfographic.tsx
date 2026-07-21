"use client";

import type { MouseEvent } from "react";
import {
  Activity,
  CheckCircle2,
  Database,
  FileText,
  Link2,
  ReceiptText,
  ShieldCheck,
  WalletCards
} from "lucide-react";

const steps = [
  { title: "Create", copy: "Invoice object", icon: FileText, meta: "01" },
  { title: "Link", copy: "Checkout URL", icon: Link2, meta: "02" },
  { title: "Review", copy: "Payer wallet", icon: WalletCards, meta: "03" },
  { title: "Pay", copy: "USDC state", icon: Activity, meta: "04" },
  { title: "Confirm", copy: "Settlement", icon: CheckCircle2, meta: "05" },
  { title: "Receipt", copy: "Proof record", icon: ReceiptText, meta: "06" },
  { title: "Audit", copy: "Console trail", icon: ShieldCheck, meta: "07" },
  { title: "Sync", copy: "Ledger data", icon: Database, meta: "08" }
] as const;

const proofSteps = [
  { label: "payer wallet", value: "assigned" },
  { label: "status", value: "pending" },
  { label: "amount", value: "250 USDC" },
  { label: "receipt", value: "reserved" },
  { label: "proof", value: "tx hash" },
  { label: "console", value: "indexed" }
] as const;

function moveLight(event: MouseEvent<HTMLElement>) {
  const target = event.currentTarget;
  const rect = target.getBoundingClientRect();
  target.style.setProperty("--x", `${event.clientX - rect.left}px`);
  target.style.setProperty("--y", `${event.clientY - rect.top}px`);
}

function WorkflowCard({ step }: { step: (typeof steps)[number] }) {
  const Icon = step.icon;

  return (
    <div className="sf-workflow-loop-card">
      <div className="flex items-start justify-between gap-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-[#e5f8e9] text-[#0b8f58] ring-1 ring-[#c7eccf]">
          <Icon className="h-6 w-6" />
        </span>
        <span className="font-mono text-xs font-black text-[#9caa9c]">{step.meta}</span>
      </div>
      <h4 className="mt-8 text-3xl font-black tracking-[-0.035em] text-[#07111f]">{step.title}</h4>
      <p className="mt-2 text-sm font-bold leading-6 text-[#667085]">{step.copy}</p>
    </div>
  );
}

export function WorkflowInfographic() {
  const loopSteps = [...steps, ...steps];
  const loopProofSteps = [...proofSteps, ...proofSteps, ...proofSteps];

  return (
    <section className="relative overflow-hidden bg-[#f7fbf4] px-4 py-14 sm:px-6 lg:px-8 2xl:px-10" id="workflow">
      <div className="mx-auto max-w-[1760px]">
        <div className="relative grid min-h-[940px] overflow-hidden rounded-[4rem] border border-[#d8e8d3] bg-[linear-gradient(135deg,#f1f8ec_0%,#eaf6e3_52%,#f7fbf4_100%)] px-6 py-16 shadow-[0_38px_140px_rgba(4,41,31,0.07)] sm:px-10 lg:grid-cols-[0.42fr_0.58fr] lg:items-center lg:px-16 lg:py-28 2xl:px-20">
          <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full bg-[#a8ef72]/20 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 right-0 h-96 w-96 rounded-full bg-[#e6ffd7]/70 blur-3xl" />
          <div className="pointer-events-none absolute inset-x-10 top-10 h-px bg-gradient-to-r from-transparent via-[#c7eccf] to-transparent" />

          <div className="max-w-2xl">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-[#0b8f58]">Workflow</p>
            <h2 className="mt-6 text-[clamp(3.4rem,6.6vw,7.6rem)] font-black leading-[0.88] tracking-[-0.055em] text-[#07111f]">
              One flow from invoice to proof.
            </h2>
            <p className="mt-8 max-w-xl text-2xl font-semibold leading-10 text-[#5f6f65]">
              Every step moves as one settlement loop: create the request, route the payer, confirm USDC, and reconcile the receipt.
            </p>
            <div className="mt-10 grid max-w-xl gap-3 sm:grid-cols-3">
              {[
                ["8", "operating states"],
                ["1", "shared invoice link"],
                ["0", "merchant self-pay"]
              ].map(([value, label]) => (
                    <div className="rounded-[1.5rem] border border-[#d8e8d3] bg-[#fbfff8]/80 p-4 shadow-[0_16px_45px_rgba(4,41,31,0.05)]" key={label}>
                  <p className="text-3xl font-black text-[#063f2c]">{value}</p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[#738071]">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <article className="sf-light-card" onMouseMove={moveLight}>
                <div className="relative z-10 overflow-hidden rounded-[3rem] bg-[#fbfff8]/90 p-6 sm:p-8 lg:p-10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-[#0b8f58]">Settlement loop</p>
                  <h3 className="mt-3 text-4xl font-black tracking-[-0.035em] text-[#063f2c]">Live workflow rail</h3>
                </div>
                <CheckCircle2 className="h-8 w-8 text-[#0b8f58]" />
              </div>

              <div className="sf-workflow-fade mt-12 overflow-hidden py-4">
                <div className="sf-workflow-track">
                  {loopSteps.map((step, index) => (
                    <WorkflowCard step={step} key={`${step.title}-${index}`} />
                  ))}
                </div>
              </div>

              <div className="sf-workflow-fade mt-5 overflow-hidden py-2">
                <div className="sf-workflow-track sf-workflow-track-reverse">
                  {loopProofSteps.map((step, index) => (
                    <div className="sf-proof-pill" key={`${step.label}-${index}`}>
                      <span>{step.label}</span>
                      <strong>{step.value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-10 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-[2rem] bg-[#063f2c] p-6 text-white">
                  <p className="text-2xl font-black tracking-[-0.03em]">Traceable by default.</p>
                  <p className="mt-3 text-base font-semibold leading-7 text-white/68">
                    Every action becomes a settlement object with wallet role, status, receipt, and proof context.
                  </p>
                </div>
                    <div className="grid gap-3 rounded-[2rem] border border-[#d8e8d3] bg-[#f1f8ec] p-4">
                  {[
                    ["Merchant", "creates and shares"],
                    ["Payer", "authorizes USDC"],
                    ["Console", "indexes proof"]
                  ].map(([label, value]) => (
                    <div className="flex items-center justify-between rounded-2xl bg-white/75 px-4 py-3" key={label}>
                      <span className="text-sm font-black text-[#657364]">{label}</span>
                      <span className="font-mono text-sm font-black text-[#063f2c]">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
