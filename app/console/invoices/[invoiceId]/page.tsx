import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Link2,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DataPanel } from "@/components/console/DataPanel";
import { StatusPill } from "@/components/console/StatusPill";
import { WalletStatusCard } from "@/components/wallet/WalletStatusCard";
import { getV2InvoiceDetail } from "@/lib/v2MockData";
import { shortenWalletAddress } from "@/lib/walletDisplay";
import { V2AuditTimelineItem } from "@/types/v2";

type InvoiceDetailPageProps = {
  params: Promise<{ invoiceId: string }>;
};

function formatUSDC(value: number) {
  return `${value.toLocaleString("en-US")} USDC`;
}

function formatDate(value?: string) {
  if (!value) return "Reserved";
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function TimelineIcon({ item }: { item: V2AuditTimelineItem }) {
  if (item.state === "complete") return <CheckCircle2 className="h-5 w-5 text-arc-600" />;
  if (item.state === "pending") return <Clock3 className="h-5 w-5 text-amber-600" />;
  return <ShieldCheck className="h-5 w-5 text-slate-400" />;
}

export default async function ConsoleInvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { invoiceId } = await params;
  const detail = getV2InvoiceDetail(invoiceId);

  if (!detail) notFound();

  const { customer, invoice, order, timeline } = detail;
  const receiptHref = `/receipt/${invoice.id}`;
  const roleLabel = invoice.direction === "receivable" ? "Receivable" : "Payable";
  const RoleIcon = invoice.direction === "receivable" ? ArrowDownLeft : ArrowUpRight;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          className="inline-flex w-fit items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-arc-100 hover:bg-arc-50"
          href="/console/invoices"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to invoices
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {invoice.direction === "payable" ? (
            <Link
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:border-arc-100 hover:bg-arc-50"
              href={invoice.paymentLink}
            >
              <ExternalLink className="h-4 w-4" />
              Open pay page
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-500">
              <Link2 className="h-4 w-4" />
              Payment link ready
            </span>
          )}
          <Link
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800"
            href={receiptHref}
          >
            <ReceiptText className="h-4 w-4" />
            View receipt
          </Link>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-black text-arc-600">Invoice Detail</p>
              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[1.02] tracking-tight text-ink md:text-5xl">
                {invoice.title}
              </h2>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <p className="font-mono text-sm font-bold text-slate-500">{invoice.id}</p>
                <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black ${
                  invoice.direction === "receivable" ? "bg-arc-50 text-arc-700" : "bg-amber-50 text-amber-700"
                }`}>
                  <RoleIcon className="h-3.5 w-3.5" />
                  {roleLabel}
                </span>
              </div>
            </div>
            <StatusPill status={invoice.status} />
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Amount</p>
              <p className="mt-3 text-3xl font-black text-ink">{formatUSDC(invoice.amount)}</p>
              <p className="mt-2 text-sm font-bold text-muted">Settlement asset</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Counterparty</p>
              <p className="mt-3 text-xl font-black text-ink">
                {invoice.direction === "receivable" ? invoice.payerName : invoice.merchantName}
              </p>
              <p className="mt-2 text-sm font-bold text-muted">
                {invoice.direction === "receivable" ? "Payer wallet" : "Merchant wallet"}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Order</p>
              <p className="mt-3 text-xl font-black text-ink">{order.id}</p>
              <p className="mt-2 text-sm font-bold text-muted">{order.category}</p>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-5">
            <div className="flex items-center gap-2 text-sm font-black text-arc-600">
              <Link2 className="h-4 w-4" />
              Payment object
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Payment link</p>
                <p className="mt-2 break-all font-mono text-sm font-bold text-ink">{invoice.paymentLink}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Memo</p>
                <p className="mt-2 text-sm font-bold leading-6 text-ink">{invoice.memo || "No memo"}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Merchant wallet</p>
                <p className="mt-2 font-mono text-sm font-bold text-ink">{shortenWalletAddress(invoice.merchantWallet)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Payer wallet</p>
                <p className="mt-2 font-mono text-sm font-bold text-ink">{shortenWalletAddress(invoice.payerWallet)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Proof</p>
                <p className="mt-2 break-all font-mono text-sm font-bold text-ink">
                  {invoice.txHash ? shortenWalletAddress(invoice.txHash) : "Waiting for tx hash"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <WalletStatusCard audience="merchant" />

          <DataPanel eyebrow="Actions" title="Invoice operating controls">
            <div className="grid gap-3">
              {[
                ["Copy payment link", "Ready for customer sharing", Copy, invoice.status === "draft" ? "reserved" : "ready"],
                ["QR payment", invoice.qrPayment ? "Mobile checkout enabled" : "Reserved for V2 mode", QrCode, invoice.qrPayment ? "ready" : "reserved"],
                ["PDF receipt", invoice.pdfReceipt ? "Receipt export ready" : "Issued after payment", FileText, invoice.pdfReceipt ? "ready" : "reserved"],
                ["Real transfer", "Reserved for USDC transfer wiring", Wallet, "reserved"]
              ].map(([title, detailText, Icon, state]) => (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4" key={title as string}>
                  <div className="flex items-center gap-3">
                    <span className="rounded-xl bg-white p-2 text-arc-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-black text-ink">{title as string}</p>
                      <p className="mt-1 text-sm font-semibold text-muted">{detailText as string}</p>
                    </div>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-black ${state === "ready" ? "bg-arc-50 text-arc-600" : "bg-slate-100 text-slate-500"}`}>
                    {state as string}
                  </span>
                </div>
              ))}
            </div>
          </DataPanel>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <DataPanel eyebrow="Counterparty and order" title="Commercial context">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Counterparty contact</p>
              <p className="mt-3 text-lg font-black text-ink">{customer.email}</p>
              <p className="mt-2 text-sm font-bold text-muted">
                {invoice.merchantName} → {invoice.payerName}
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Order status</p>
              <p className="mt-3 text-lg font-black capitalize text-ink">{order.status}</p>
              <p className="mt-2 text-sm font-bold text-muted">{order.title}</p>
            </div>
          </div>
        </DataPanel>

        <DataPanel eyebrow="Audit trail" title="Receipt and proof timeline">
          <div className="space-y-3">
            {timeline.map((item) => (
              <div className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4" key={item.id}>
                <span className="mt-1 rounded-xl bg-white p-2">
                  <TimelineIcon item={item} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-black text-ink">{item.label}</p>
                    <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-black capitalize text-slate-500">
                      {item.state}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold leading-6 text-muted">{item.detail}</p>
                  <p className="mt-2 text-xs font-bold text-slate-400">{formatDate(item.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        </DataPanel>
      </section>
    </div>
  );
}
