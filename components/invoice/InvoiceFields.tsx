import { CalendarClock, Wallet } from "lucide-react";
import { WalletConnectControl } from "@/components/wallet/WalletConnectControl";

export type InvoiceFormValues = {
  customerName: string;
  customerWallet: string;
  title: string;
  amount: string;
  description: string;
  memo: string;
  expiresAt: string;
};

type InvoiceFieldsProps = {
  change: (name: keyof InvoiceFormValues, value: string) => void;
  disabled?: boolean;
  form: InvoiceFormValues;
  formError?: string;
  merchantWalletDisplay: {
    badge: string;
    detail: string;
    isConnected: boolean;
  };
  minExpireAt: string;
  submitLabel?: string;
};

const fieldClass =
  "mt-2 h-12 min-w-0 w-full rounded-[1.05rem] border border-[#e6e2d8] bg-white/90 px-4 text-base font-black text-ink outline-none transition placeholder:text-[#b7b8b0] focus:border-[#0fa86b] focus:ring-4 focus:ring-[#dff4e5]";
const labelClass = "text-xs font-black uppercase tracking-[0.13em] text-muted";

export function InvoiceFields({ change, disabled, form, formError, merchantWalletDisplay, minExpireAt, submitLabel = "Create invoice" }: InvoiceFieldsProps) {
  return (
    <fieldset
      className="sf-float-card relative overflow-hidden rounded-[2.15rem] border border-white/75 bg-white/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_34px_100px_rgba(4,41,31,0.12)] backdrop-blur-2xl sm:p-5 xl:p-6"
      disabled={disabled}
    >
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
          <WalletConnectControl label="Change wallet" size="sm" tone="light" />
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <label className="block min-w-0">
            <span className={labelClass}>Payer name</span>
            <input
              className={fieldClass}
              onChange={(event) => change("customerName", event.target.value)}
              placeholder="Customer name"
              value={form.customerName}
            />
          </label>
          <label className="block min-w-0">
            <span className={labelClass}>Payer wallet</span>
            <input
              className={`${fieldClass} font-mono text-sm placeholder:font-sans`}
              onChange={(event) => change("customerWallet", event.target.value)}
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
            onChange={(event) => change("title", event.target.value)}
            placeholder="Checkout implementation"
            required
            value={form.title}
          />
        </label>

        <label className="block min-w-0">
          <span className={labelClass}>Description</span>
          <textarea
            className="mt-2 min-h-24 w-full min-w-0 resize-y rounded-[1.05rem] border border-[#e6e2d8] bg-white/90 px-4 py-3 text-base font-bold leading-6 text-ink outline-none transition placeholder:text-[#b7b8b0] focus:border-[#0fa86b] focus:ring-4 focus:ring-[#dff4e5]"
            onChange={(event) => change("description", event.target.value)}
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
                min="0.000001"
                onChange={(event) => change("amount", event.target.value)}
                placeholder="0.00"
                required
                step="0.000001"
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
                onChange={(event) => change("expiresAt", event.target.value)}
                type="datetime-local"
                value={form.expiresAt}
              />
            </div>
          </label>
          <label className="block min-w-0">
            <span className={labelClass}>Memo</span>
            <input
              className={fieldClass}
              onChange={(event) => change("memo", event.target.value)}
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
          disabled={disabled}
          type="submit"
        >
          {submitLabel}
        </button>

        <p className="text-center text-xs font-bold text-muted">
          Your invoice data stays attached to the payment link, receipt, and dashboard record.
        </p>
      </div>
    </fieldset>
  );
}
