import { ArrowDownLeft, ExternalLink, ShieldCheck, WalletCards } from "lucide-react";
import Link from "next/link";

export function ConsoleShortcuts() {
  return (
    <section className="grid gap-4 xl:grid-cols-3">
      <Link
        className="flex items-center justify-between rounded-3xl border border-arc-100 bg-arc-50 p-5 text-sm font-black text-arc-900 shadow-card transition hover:-translate-y-0.5 hover:bg-[#dcf8e4]"
        href="/invoice/new"
      >
        <span className="flex items-center gap-3">
          <ArrowDownLeft className="h-5 w-5" />
          Create receivable invoice
        </span>
        <ExternalLink className="h-4 w-4" />
      </Link>
      <Link
        className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white p-5 text-sm font-black text-ink shadow-card transition hover:-translate-y-0.5 hover:border-arc-100 hover:bg-slate-50"
        href="/console/invoices"
      >
        <span className="flex items-center gap-3">
          <WalletCards className="h-5 w-5 text-arc-600" />
          Review full invoice ledger
        </span>
        <ExternalLink className="h-4 w-4" />
      </Link>
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="flex items-center gap-3 text-sm font-black text-ink">
          <ShieldCheck className="h-5 w-5 text-arc-600" />
          Wallet role guard active
        </div>
        <p className="mt-2 text-sm font-semibold leading-6 text-muted">
          Merchant wallets create invoices. Assigned payer wallets complete payment.
        </p>
      </div>
    </section>
  );
}
