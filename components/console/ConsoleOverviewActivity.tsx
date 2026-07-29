import { ArrowDownLeft, ArrowUpRight, ReceiptText } from "lucide-react";
import Link from "next/link";
import { DataPanel } from "@/components/console/DataPanel";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency, formatDate } from "@/lib/format";
import { cashflowWidth } from "@/lib/cashflow";
import { Invoice } from "@/types/invoice";

type ConsoleOverviewActivityProps = {
  latestEvents: Invoice[];
  receivables: Invoice[];
  summary: {
    pendingPayableAmount: bigint;
    pendingReceivableAmount: bigint;
    totalReceived: bigint;
  };
};

export function ConsoleOverviewActivity({ latestEvents, receivables, summary }: ConsoleOverviewActivityProps) {
  const cashflowRows = [
    {
      label: "Collected",
      amount: summary.totalReceived,
      detail: "Paid receivables",
      color: "bg-arc-600",
      Icon: ReceiptText
    },
    {
      label: "Still to collect",
      amount: summary.pendingReceivableAmount,
      detail: "Open receivables",
      color: "bg-amber-500",
      Icon: ArrowDownLeft
    },
    {
      label: "Still to pay",
      amount: summary.pendingPayableAmount,
      detail: "Open payables",
      color: "bg-slate-900",
      Icon: ArrowUpRight
    }
  ];
  const total = cashflowRows.reduce((sum, row) => sum + row.amount, 0n);

  return (
    <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <DataPanel
        action={<Link className="text-sm font-black text-arc-700 transition hover:text-arc-600" href="/console/invoices">Open ledger</Link>}
        eyebrow="Reconciliation"
        title="Cashflow split"
      >
        <div className="space-y-4">
          {cashflowRows.map(({ label, amount, detail, color, Icon }) => {
            return (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4" key={label}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-white p-2 text-arc-600">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-black text-ink">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-muted">{detail}</p>
                    </div>
                  </div>
                  <p className="font-mono text-sm font-black text-ink">{formatCurrency(amount)}</p>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
                  <div className={`h-full rounded-full ${color}`} style={{ width: cashflowWidth(amount, total) }} />
                </div>
              </div>
            );
          })}
        </div>
      </DataPanel>

      <DataPanel eyebrow="Events" title="Latest invoice state changes">
        <div className="space-y-3">
          {latestEvents.length ? (
            latestEvents.map((invoice) => {
              const isReceivable = receivables.some((item) => item.id === invoice.id);

              return (
                <div className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_auto]" key={invoice.id}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-1 rounded-xl p-2 ${isReceivable ? "bg-arc-50 text-arc-600" : "bg-amber-50 text-amber-600"}`}>
                      {isReceivable ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                    </span>
                    <div>
                      <p className="font-black text-ink">{invoice.title ?? "Metadata unavailable"}</p>
                      <p className="mt-1 text-sm font-semibold text-muted">
                        {isReceivable ? "Issued receivable" : "Received payable"} / {formatDate(invoice.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    <p className="font-mono text-sm font-black text-ink">{formatCurrency(invoice.amount)}</p>
                    <StatusBadge status={invoice.status} />
                  </div>
                </div>
              );
            })
          ) : (
            <EmptyQueue label="No invoice events for this wallet yet." />
          )}
        </div>
      </DataPanel>
    </section>
  );
}

function EmptyQueue({ label }: { label: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-7 text-sm font-semibold text-muted">
      {label}
    </div>
  );
}
