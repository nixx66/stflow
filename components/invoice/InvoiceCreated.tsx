import { CheckCircle2, Copy, Link2, ReceiptText } from "lucide-react";
import { getArcExplorerTxUrl } from "@/lib/arc";
import { copyToClipboard } from "@/lib/format";
import { Invoice } from "@/types/invoice";

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

type InvoiceCreatedProps = {
  invoice?: Invoice;
  metadataPending?: boolean;
  onRetryMetadata?: () => void;
  paymentLink: string;
  txHash?: string;
  retryingMetadata?: boolean;
};

export function InvoiceCreated({
  invoice,
  metadataPending,
  onRetryMetadata,
  paymentLink,
  retryingMetadata,
  txHash
}: InvoiceCreatedProps) {
  return (
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

      {invoice ? (
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
              <p className="mt-2 break-all font-mono text-xs font-bold text-[#667085]">
                Invoice ID: {invoice.id}
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
              {txHash ? (
                <a
                  className="inline-flex h-11 items-center justify-center rounded-full bg-[#063f2c] px-4 text-sm font-black text-white transition hover:bg-[#0b5d43] active:translate-y-px"
                  href={getArcExplorerTxUrl(txHash)}
                  rel="noreferrer"
                  target="_blank"
                >
                  View on Arcscan
                </a>
              ) : null}
            </div>
          </div>
          {metadataPending ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-800">
              <p>The invoice is confirmed onchain. Retry saving its display metadata without creating another transaction.</p>
              <button
                className="rounded-full bg-amber-900 px-4 py-2 text-xs font-black text-white disabled:opacity-60"
                disabled={retryingMetadata}
                onClick={onRetryMetadata}
                type="button"
              >
                {retryingMetadata ? "Retrying…" : "Retry metadata"}
              </button>
            </div>
          ) : null}
          <p className="mt-3 text-sm font-bold leading-6 text-[#667085]">
            Send this link to the payer wallet. Merchant wallets can review the invoice, but cannot complete their own checkout.
          </p>
        </div>
      ) : null}
    </section>
  );
}
