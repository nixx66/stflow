"use client";

import { CalendarClock, CheckCircle2, Copy, Link2, ReceiptText, ShieldCheck, Wallet } from "lucide-react";
import { FormEvent, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { useInvoices } from "@/hooks/useInvoice";
import { copyToClipboard } from "@/lib/format";
import { isValidInvoiceWalletAddress } from "@/lib/invoiceCreateReadiness";
import { MOCK_MERCHANT_A } from "@/lib/mockData";
import { getPaymentMode, isLivePaymentMode } from "@/lib/paymentMode";
import { buildSharedInvoicePayUrl } from "@/lib/sharedInvoiceLink";
import { getMerchantWalletDisplay } from "@/lib/walletDisplay";
import { Invoice } from "@/types/invoice";
import { WalletConnectControl } from "./wallet/WalletConnectControl";

const previewItems = [
  {
    title: "Payment link",
    body: "A shareable checkout link will expire after the payment deadline.",
    icon: Link2
  },
  {
    title: "Receipt",
    body: "A receipt will be created after payment is confirmed.",
    icon: ReceiptText
  },
  {
    title: "Dashboard record",
    body: "The settlement record will sync into the dashboard.",
    icon: CheckCircle2
  }
] as const;

const trustItems = [
  {
    title: "On-chain by design",
    body: "Every invoice is live-ready and verifiable.",
    icon: Link2
  },
  {
    title: "Secure and transparent",
    body: "Built for stablecoin settlement records.",
    icon: ShieldCheck
  },
  {
    title: "Instant tracking",
    body: "Payment, receipt, and dashboard stay connected.",
    icon: CheckCircle2
  }
] as const;

export function InvoiceForm() {
  const { createInvoice } = useInvoices();
  const { address: connectedMerchantWallet } = useAccount();
  const paymentMode = getPaymentMode();
  const livePayment = isLivePaymentMode(paymentMode);
  const merchantWallet = livePayment && connectedMerchantWallet ? connectedMerchantWallet : MOCK_MERCHANT_A;
  const merchantWalletDisplay = getMerchantWalletDisplay({
    connectedWallet: connectedMerchantWallet,
    livePayment
  });
  const [createdInvoice, setCreatedInvoice] = useState<Invoice>();
  const [formError, setFormError] = useState<string>();
  const [form, setForm] = useState({
    customerName: "Builder team",
    customerWallet: "",
    title: "USDC checkout invoice",
    amount: "250",
    description: "Stablecoin checkout payment for settlement tracking.",
    memo: "Thanks for your payment.",
    expiresAt: ""
  });

  const paymentLink = useMemo(() => {
    if (!createdInvoice || typeof window === "undefined") return "";
    return buildSharedInvoicePayUrl(window.location.origin, createdInvoice);
  }, [createdInvoice]);

  const minExpireAt = useMemo(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset() + 1);
    return date.toISOString().slice(0, 16);
  }, []);

  const updateField = (name: keyof typeof form, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(undefined);

    if (form.expiresAt && new Date(form.expiresAt).getTime() <= Date.now()) {
      setFormError("Payment deadline must be later than the current time.");
      return;
    }

    if (livePayment && !connectedMerchantWallet) {
      setFormError("Connect the merchant wallet before creating a live invoice.");
      return;
    }

    const payerWallet = form.customerWallet.trim();

    if (!payerWallet) {
      setFormError("Enter the payer wallet so this invoice can appear in the payer dashboard.");
      return;
    }

    if (!isValidInvoiceWalletAddress(payerWallet)) {
      setFormError("Enter a valid EVM payer wallet address.");
      return;
    }

    if (payerWallet.toLowerCase() === merchantWallet.toLowerCase()) {
      setFormError("Payer wallet must be different from the merchant wallet.");
      return;
    }

    const invoice = createInvoice({
      merchantWallet,
      customerName: form.customerName,
      customerWallet: payerWallet,
      title: form.title,
      amount: form.amount,
      description: form.description,
      memo: form.memo,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined
    });
    setCreatedInvoice(invoice);
  };

  const fieldClass =
    "mt-2 h-12 min-w-0 w-full rounded-[1.05rem] border border-[#e6e2d8] bg-white/90 px-4 text-base font-black text-ink outline-none transition placeholder:text-[#b7b8b0] focus:border-[#0fa86b] focus:ring-4 focus:ring-[#dff4e5]";
  const labelClass = "text-xs font-black uppercase tracking-[0.13em] text-muted";

  return (
    <div className="sf-invoice-shell mx-auto max-w-[1680px] rounded-[2.5rem] border border-white/60 bg-white/35 p-3 shadow-[0_40px_120px_rgba(4,41,31,0.12)] backdrop-blur-2xl">
      <form className="relative z-10 grid gap-4 lg:grid-cols-[0.72fr_1.28fr]" onSubmit={handleSubmit}>
        <aside className="relative overflow-hidden rounded-[2.15rem] border border-white/70 bg-[linear-gradient(150deg,rgba(255,255,255,0.88),rgba(231,248,236,0.54)_52%,rgba(255,248,232,0.82))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_26px_70px_rgba(4,41,31,0.08)] sm:p-7">
          <div className="sf-wave-field pointer-events-none absolute inset-x-0 bottom-0 h-56 opacity-80" />
          <div className="pointer-events-none absolute -left-20 bottom-8 h-52 w-52 rounded-full bg-[#a8ef72]/20 blur-3xl" />
          <div className="relative z-10 flex min-h-full flex-col">
            <span className="w-fit rounded-full bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#0fa86b] ring-1 ring-white/80">
              Invoices
            </span>
            <h1 className="mt-6 max-w-md text-4xl font-black leading-[0.95] tracking-tight text-[#063f2c] sm:text-5xl xl:text-6xl">
              Create your invoice
            </h1>
            <p className="mt-5 max-w-md text-sm font-semibold leading-7 text-[#667085]">
              Add the merchant wallet, payer, amount, and payment details. STFlow turns the invoice into a payment link, receipt, and dashboard record.
            </p>

            <div className="mt-6 grid gap-3 rounded-[1.4rem] border border-white/75 bg-white/60 p-3 shadow-[0_18px_55px_rgba(4,41,31,0.06)] backdrop-blur-xl">
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="sf-hover flex items-start gap-3 rounded-2xl bg-white/70 p-3" key={item.title}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f8ec] text-[#0fa86b] ring-1 ring-[#c9ecd3]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-[#063f2c]">{item.title}</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-muted">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-auto hidden min-h-48 items-center justify-center pt-8 lg:flex">
              <div className="sf-orb-pulse flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white/55 shadow-[0_30px_80px_rgba(15,168,107,0.24)] backdrop-blur-xl">
                <img
                  alt="USDC coin"
                  className="h-full w-full object-cover"
                  src="/usdc-coin.png"
                />
              </div>
            </div>
          </div>
        </aside>

        <section className="sf-float-card relative overflow-hidden rounded-[2.15rem] border border-white/75 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_34px_100px_rgba(4,41,31,0.12)] backdrop-blur-2xl sm:p-5 xl:p-6">
          <div className="pointer-events-none absolute right-5 top-5 h-24 w-24 rounded-full bg-[#a8ef72]/20 blur-2xl" />
          <div className="relative z-10 grid gap-4">
            <div className="flex flex-col gap-3 border-b border-[#e6e2d8] pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#e7f8ec] text-[#0fa86b] ring-1 ring-[#c9ecd3]">
                  <Wallet className="h-5 w-5" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-black text-ink">Merchant wallet</p>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${
                        merchantWalletDisplay.isConnected
                          ? "bg-[#e7f8ec] text-[#063f2c] ring-[#c9ecd3]"
                          : "bg-amber-50 text-amber-800 ring-amber-200"
                      }`}
                    >
                      {merchantWalletDisplay.badge}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-sm font-black text-muted">
                    {merchantWalletDisplay.detail}
                  </p>
                </div>
              </div>
              {livePayment ? (
                <WalletConnectControl label="Change wallet" size="sm" tone="light" />
              ) : (
                <span className="inline-flex h-10 w-fit items-center rounded-full bg-white px-4 text-sm font-black text-[#063f2c] ring-1 ring-[#e6e2d8]">
                  Testnet demo
                </span>
              )}
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <label className="block min-w-0">
                <span className={labelClass}>Payer name</span>
                <input
                  className={fieldClass}
                  onChange={(event) => updateField("customerName", event.target.value)}
                  placeholder="Customer name"
                  value={form.customerName}
                />
              </label>
              <label className="block min-w-0">
                <span className={labelClass}>Payer wallet</span>
                <input
                  className={`${fieldClass} font-mono text-sm placeholder:font-sans`}
                  onChange={(event) => updateField("customerWallet", event.target.value)}
                  placeholder="0x... payer wallet"
                  required
                  value={form.customerWallet}
                />
              </label>
            </div>

            <label className="block min-w-0">
              <span className={labelClass}>Invoice title</span>
              <input
                className={fieldClass}
                onChange={(event) => updateField("title", event.target.value)}
                placeholder="Checkout implementation"
                required
                value={form.title}
              />
            </label>

            <label className="block min-w-0">
              <span className={labelClass}>Description</span>
              <textarea
                className="mt-2 min-h-24 w-full min-w-0 resize-y rounded-[1.05rem] border border-[#e6e2d8] bg-white/90 px-4 py-3 text-base font-bold leading-6 text-ink outline-none transition placeholder:text-[#b7b8b0] focus:border-[#0fa86b] focus:ring-4 focus:ring-[#dff4e5]"
                onChange={(event) => updateField("description", event.target.value)}
                placeholder="Describe deliverables, milestone, or payment reason"
                value={form.description}
              />
            </label>

            <div className="relative overflow-hidden rounded-[1.45rem] border border-[#f0d057] bg-[linear-gradient(115deg,#fff4a8,rgba(231,248,236,0.78)_68%,#ffffff)] p-4 text-[#04291f] shadow-[0_24px_70px_rgba(255,216,90,0.22)]">
              <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-[#a8ef72]/30 blur-2xl" />
              <div className="relative z-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-black uppercase tracking-[0.16em]">Amount in USDC</span>
                  <input
                    className="mt-2 min-w-0 bg-transparent text-5xl font-black leading-none tracking-tight outline-none placeholder:text-[#8b7a24] sm:text-6xl"
                    min="0.01"
                    onChange={(event) => updateField("amount", event.target.value)}
                    placeholder="0.00"
                    required
                    step="0.01"
                    type="number"
                    value={form.amount}
                  />
                </div>
                <span className="inline-flex h-12 w-fit items-center gap-2 rounded-full bg-white/80 px-5 text-base font-black text-[#063f2c] shadow-[0_14px_42px_rgba(15,168,107,0.22)] ring-1 ring-white/90 backdrop-blur-xl">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#0fa86b] text-sm text-white">$</span>
                  USDC
                </span>
              </div>
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)]">
              <label className="block min-w-0">
                <span className={labelClass}>Payment deadline</span>
                <div className="mt-2 flex h-12 items-center gap-3 rounded-[1.05rem] border border-[#e6e2d8] bg-white/90 px-4 transition focus-within:border-[#0fa86b] focus-within:ring-4 focus-within:ring-[#dff4e5]">
                  <CalendarClock className="h-5 w-5 text-muted" />
                  <input
                    className="min-w-0 flex-1 text-base font-black text-ink outline-none"
                    min={minExpireAt}
                    onChange={(event) => updateField("expiresAt", event.target.value)}
                    type="datetime-local"
                    value={form.expiresAt}
                  />
                </div>
              </label>
              <label className="block min-w-0">
                <span className={labelClass}>Memo</span>
                <input
                  className={fieldClass}
                  onChange={(event) => updateField("memo", event.target.value)}
                  placeholder="Optional note shown on receipt"
                  value={form.memo}
                />
              </label>
            </div>

            {formError ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3 text-sm font-black text-red-700">
                {formError}
              </p>
            ) : null}

            <button
              className="sf-button-shine inline-flex h-12 w-full items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,#0fa86b,#063f2c)] px-5 text-base font-black text-white shadow-[0_18px_45px_rgba(15,168,107,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_58px_rgba(15,168,107,0.32)] active:translate-y-px disabled:cursor-not-allowed disabled:bg-white/25 disabled:text-white/50"
              type="submit"
            >
              Create invoice
            </button>

            <p className="text-center text-xs font-bold text-muted">
              Your invoice data stays attached to the payment link, receipt, and dashboard record.
            </p>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/75 bg-white/70 p-4 shadow-[0_22px_70px_rgba(4,41,31,0.08)] backdrop-blur-2xl lg:col-span-2">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0fa86b]">After creation</p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {previewItems.map((item) => {
              const Icon = item.icon;
              return (
                <div className="sf-hover flex items-start gap-3 rounded-[1.2rem] border border-[#e6e2d8] bg-white/70 p-4" key={item.title}>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e7f8ec] text-[#0fa86b] ring-1 ring-[#c9ecd3]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-black text-[#07111f]">{item.title}</p>
                    <p className="mt-1 text-xs font-bold leading-5 text-muted">{item.body}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {createdInvoice ? (
            <div className="mt-4 rounded-[1.45rem] border border-[#c9ecd3] bg-[#e7f8ec]/70 p-4 shadow-[0_18px_50px_rgba(15,168,107,0.12)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#0fa86b]" />
                    <h2 className="text-lg font-black text-[#063f2c]">Invoice created</h2>
                  </div>
                  <p className="mt-2 break-all rounded-2xl bg-white/70 px-4 py-3 font-mono text-sm font-bold text-ink">
                    {paymentLink}
                  </p>
                </div>
                <div className="grid shrink-0 gap-3">
                  <button
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-[#063f2c] ring-1 ring-[#c9ecd3] transition hover:bg-[#f8fbf4] active:translate-y-px"
                    onClick={() => copyToClipboard(paymentLink)}
                    type="button"
                  >
                    <Copy className="h-4 w-4" />
                    Copy link
                  </button>
                </div>
              </div>
              <p className="mt-3 text-sm font-bold leading-6 text-[#667085]">
                Send this link to the payer wallet. Merchant wallets can review the invoice, but cannot complete their own checkout.
              </p>
            </div>
          ) : null}
        </section>
      </form>
    </div>
  );
}
