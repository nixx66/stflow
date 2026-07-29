import {
  Code2,
  FileCheck2,
  FileText,
  HelpCircle,
  Layers3,
  ListChecks,
  Network,
  Paintbrush,
  Presentation,
  Rocket,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";

const resources = [
  {
    title: "Project introduction",
    icon: FileText,
    copy: "A one-page STFlow overview for partners, judges, community members, and potential users."
  },
  {
    title: "Product walkthrough",
    icon: Presentation,
    copy: "A step-by-step walkthrough from invoice creation to payment link, receipt, and dashboard record."
  },
  {
    title: "Pitch outline",
    icon: Rocket,
    copy: "Problem, assigned-payer workflow, Arc Testnet contract authority, metadata verification, and settlement proof."
  },
  {
    title: "Launch checklist",
    icon: ListChecks,
    copy: "Wallet setup, Arc Testnet USDC, assigned-payer checkout, receipt verification, and dashboard error states."
  },
  {
    title: "FAQ starter",
    icon: HelpCircle,
    copy: "Arc Testnet payment, USDC settlement, transaction proof, merchant setup, and payer questions."
  },
  {
    title: "Compliance notes",
    icon: FileCheck2,
    copy: "Non-custodial positioning, testnet disclaimers, assigned-payer authorization, and onchain proof boundaries."
  }
] as const;

const stackGroups = [
  {
    eyebrow: "Frontend Core",
    title: "Frontend and Core System",
    icon: Layers3,
    items: [
      {
        name: "Next.js and React",
        copy: "High-performance routing and rendering for a smooth path from customer payment pages to merchant dashboard views."
      },
      {
        name: "TypeScript",
        copy: "Strict typing for invoice amounts, payment status, receipts, and dashboard records to reduce workflow errors."
      }
    ]
  },
  {
    eyebrow: "Web3 Integration",
    title: "Wallet and Chain Interaction",
    icon: WalletCards,
    items: [
      {
        name: "RainbowKit",
        copy: "A clear wallet connection layer that lowers the friction for merchants and payers connecting wallets."
      },
      {
        name: "wagmi and viem",
        copy: "Wallet state, Arc Testnet contract reads, signed metadata authorization, USDC approval, and registry settlement."
      }
    ]
  },
  {
    eyebrow: "UI and Styling",
    title: "Interface and Visual System",
    icon: Paintbrush,
    items: [
      {
        name: "Tailwind CSS",
        copy: "A utility-first styling layer for the deep green, cream, and soft yellow financial interface system."
      },
      {
        name: "Original fintech product language",
        copy: "Inspired by the clarity of Wise and the operating feel of Mercury, while keeping STFlow's own Web3 settlement identity."
      }
    ]
  },
  {
    eyebrow: "Network and Strategy",
    title: "Network Layer and Development Strategy",
    icon: Network,
    items: [
      {
        name: "Testnet",
        copy: "The fixed network for registry-backed invoice creation, assigned-payer USDC settlement, and transaction proof."
      },
      {
        name: "Arc Testnet settlement",
        copy: "Invoices are created in the registry, paid by the assigned wallet in USDC, and verified from contract state and events."
      }
    ]
  }
] as const;

const flowSteps = [
  "Create Invoice",
  "Generate Payment Link",
  "Open Pay Page",
  "Approve USDC",
  "Generate Receipt",
  "Dashboard Record"
] as const;

export default function ResourcesPage() {
  return (
    <main className="bg-[#f7f4ea]">
      <Navbar />

      <section className="relative overflow-hidden border-b border-[#e6e2d8] bg-[#063f2c] py-20 text-white">
        <div className="sf-noise absolute inset-0 opacity-30" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-[#ffd85a]/20 blur-3xl" />
        <div className="relative mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
          <p className="text-sm font-black uppercase tracking-[0.16em] text-[#ffd85a]">
            Resources / Project Kit
          </p>
          <h1 className="mt-5 max-w-6xl text-5xl font-black leading-tight tracking-tight sm:text-7xl">
            STFlow project materials and technical framework.
          </h1>
          <p className="mt-6 max-w-4xl text-xl font-semibold leading-9 text-white/72">
            Use this page to explain STFlow to friends, partners, judges, and early users. The product story stays focused on invoice, payment link, USDC payment, receipt, and dashboard reconciliation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              className="inline-flex h-14 items-center justify-center rounded-full bg-[#ffd85a] px-8 text-base font-black text-[#04291f] transition hover:bg-[#ffe27c]"
              href="/"
            >
              Back to product homepage
            </Link>
            <Link
              className="inline-flex h-14 items-center justify-center rounded-full border border-white/25 bg-white/10 px-8 text-base font-black text-white backdrop-blur transition hover:bg-white/16"
              href="/invoice/new"
            >
              Create invoice
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-[#e6e2d8] py-16 lg:py-24">
        <div className="mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
          <div className="mb-10 max-w-5xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#0fa86b]">
              Technical Stack
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-[#063f2c] sm:text-6xl">
              The stack behind STFlow.
            </h2>
            <p className="mt-5 text-lg font-semibold leading-8 text-muted">
              STFlow uses a modern Web3 frontend stack designed for financial-grade data clarity and a smooth product experience.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {stackGroups.map((group) => {
              const Icon = group.icon;
              return (
                <article
                  className="rounded-[2rem] border border-[#e6e2d8] bg-white p-6 shadow-cream transition hover:-translate-y-1 hover:border-[#0fa86b]"
                  key={group.title}
                >
                  <div className="flex items-start gap-4">
                    <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#e7f8ec] text-[#0fa86b] ring-1 ring-[#c9ecd3]">
                      <Icon className="h-6 w-6" />
                    </span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-muted">
                        {group.eyebrow}
                      </p>
                      <h3 className="mt-2 text-2xl font-black text-ink">{group.title}</h3>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4">
                    {group.items.map((item) => (
                      <div className="rounded-[1.35rem] bg-[#f7f4ea] p-5 ring-1 ring-[#e6e2d8]" key={item.name}>
                        <h4 className="text-lg font-black text-[#063f2c]">{item.name}</h4>
                        <p className="mt-3 text-base font-semibold leading-7 text-muted">{item.copy}</p>
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-b border-[#e6e2d8] bg-[#fff8e8] py-16 lg:py-24">
        <div className="mx-auto grid max-w-[1760px] gap-8 px-4 sm:px-6 lg:grid-cols-[0.45fr_0.55fr] lg:items-center lg:px-8 2xl:px-10">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#0fa86b]">
              Onchain Operation
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-[#063f2c] sm:text-6xl">
              One Arc Testnet registry is the source of truth.
            </h2>
            <p className="mt-6 text-lg font-semibold leading-8 text-muted">
              STFlow records invoice authority and settlement state in the Arc Testnet registry. Descriptive metadata is returned only when it matches the hash committed onchain.
            </p>
          </div>

          <div className="rounded-[2.25rem] border border-[#173c30] bg-[#04291f] p-6 text-white shadow-deep">
            <div className="mb-6 flex items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-[#ffd85a]" />
              <p className="font-black">Verified Arc Testnet flow</p>
            </div>
            <div className="grid gap-3">
              {flowSteps.map((step, index) => (
                <div className="flex items-center gap-4 rounded-[1.35rem] bg-white/8 p-4 ring-1 ring-white/10" key={step}>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffd85a] text-sm font-black text-[#04291f]">
                    {index + 1}
                  </span>
                  <span className="text-lg font-black">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 lg:py-24">
        <div className="mx-auto max-w-[1760px] px-4 sm:px-6 lg:px-8 2xl:px-10">
          <div className="mb-10 max-w-5xl">
            <p className="text-sm font-black uppercase tracking-[0.16em] text-[#0fa86b]">
              Shareable Materials
            </p>
            <h2 className="mt-4 text-4xl font-black leading-tight tracking-tight text-[#063f2c] sm:text-6xl">
              Project kit for product walkthroughs, pitch, and launch.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {resources.map((resource) => {
              const Icon = resource.icon;
              return (
                <article
                  className="min-h-56 rounded-[1.75rem] border border-[#e6e2d8] bg-white p-6 shadow-cream transition hover:-translate-y-1 hover:border-[#0fa86b]"
                  key={resource.title}
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e7f8ec] text-[#0fa86b] ring-1 ring-[#c9ecd3]">
                    <Icon className="h-6 w-6" />
                  </div>
                  <h2 className="mt-6 text-2xl font-black text-ink">{resource.title}</h2>
                  <p className="mt-4 text-base font-semibold leading-7 text-muted">{resource.copy}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
