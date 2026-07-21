import { CheckCircle2, Clock3, FileText, Link2, QrCode, ReceiptText } from "lucide-react";
import { formatCurrency, shortenAddress } from "@/lib/format";
import { InvoiceCreateReadinessItem } from "@/lib/invoiceCreateReadiness";
import { StatusBadge } from "./StatusBadge";

export function InvoicePreview({
  title = "USDC Checkout Implementation",
  amount = "1250",
  customerName = "Builder team",
  customerWallet = "",
  merchantWallet = "0xA12F8E7D5C4B3A2918076F5E4D3C2B1A09876543",
  memo = "STFlow V1 payment workflow",
  status = "pending",
  readiness = []
}: {
  title?: string;
  amount?: string;
  customerName?: string;
  customerWallet?: string;
  merchantWallet?: string;
  memo?: string;
  status?: "pending" | "paid" | "expired";
  readiness?: InvoiceCreateReadinessItem[];
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-card">
      <div className="border-b border-slate-100 p-6">
        <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-arc-600">Live preview</p>
          <h3 className="mt-2 text-2xl font-black tracking-tight text-ink">{title || "Untitled invoice"}</h3>
          <p className="mt-2 text-sm font-semibold text-muted">Customer-facing payment object</p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-arc-50 text-arc-600">
          <FileText className="h-5 w-5" />
        </div>
        </div>
      </div>

      <div className="p-6">
        <div className="rounded-3xl bg-slate-950 p-5 text-white">
          <p className="text-sm font-bold text-slate-300">Amount due</p>
          <p className="mt-2 text-4xl font-black tracking-tight">{formatCurrency(amount || "0")}</p>
          <div className="mt-5 flex items-center justify-between gap-4 rounded-2xl bg-white/8 p-3">
            <span className="text-xs font-black uppercase tracking-[0.16em] text-arc-100">Testnet</span>
            <StatusBadge status={status} />
          </div>
        </div>

        <dl className="mt-6 space-y-4 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-muted">Merchant wallet</dt>
            <dd className="font-mono font-black text-ink">{shortenAddress(merchantWallet)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-muted">Bill to</dt>
            <dd className="max-w-48 text-right font-bold text-ink">{customerName || "Customer"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-muted">Payer contact</dt>
            <dd className="max-w-48 truncate text-right font-mono text-xs font-black text-ink">
              {customerWallet || "Not set"}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-muted">Memo</dt>
            <dd className="max-w-48 text-right font-bold text-ink">{memo || "-"}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="font-semibold text-muted">Receipt mode</dt>
            <dd className="font-bold text-ink">Web receipt first</dd>
          </div>
        </dl>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[
            ["Link", Link2],
            ["QR", QrCode],
            ["Receipt", ReceiptText]
          ].map(([label, Icon]) => (
            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3" key={label as string}>
              <Icon className="h-4 w-4 text-arc-600" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label as string}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4">
          <p className="text-sm font-black text-ink">Creation readiness</p>
          <div className="mt-4 space-y-3">
            {readiness.map((item) => (
              <div className="flex gap-3" key={item.id}>
                {item.ready ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-arc-600" />
                ) : (
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                )}
                <div>
                  <p className="text-sm font-black text-ink">{item.label}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-muted">{item.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
