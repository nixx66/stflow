"use client";

import { Download } from "lucide-react";
import { useMemo } from "react";
import { useAccount } from "wagmi";
import { ConsoleLoadState } from "@/components/console/ConsoleLoadState";
import { DataPanel } from "@/components/console/DataPanel";
import { useInvoices } from "@/hooks/useInvoice";
import { invoiceCsv, orderRows } from "@/lib/consoleViews";

export default function ExportPage() {
  const { address } = useAccount();
  const { invoices, status, refresh } = useInvoices();
  const orders = useMemo(() => orderRows(invoices, address), [address, invoices]);
  const csv = useMemo(() => invoiceCsv(invoices, address), [address, invoices]);

  if (status !== "ready" && status !== "partial") {
    return <ConsoleLoadState refresh={refresh} status={status} title="Export invoice ledger" />;
  }

  function download() {
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `stflow-invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <header className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-card">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-arc-600">Portable records</p>
        <h2 className="mt-3 text-4xl font-black tracking-tight text-ink">Export invoice ledger</h2>
        <p className="mt-3 max-w-3xl font-semibold leading-7 text-muted">Download the connected wallet&apos;s receivables and payables as a standards-compatible CSV file.</p>
      </header>

      <DataPanel
        eyebrow="CSV export"
        title={`${orders.length} invoice records ready`}
        action={
          <button className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40" disabled={!orders.length} onClick={download} type="button">
            <Download className="h-4 w-4" /> Download CSV
          </button>
        }
      >
        <p className="font-semibold leading-7 text-muted">Columns include invoice ID, wallet role, merchant, payer, amount, status, and chain-derived timestamps. Empty fields remain blank rather than being invented.</p>
      </DataPanel>
    </div>
  );
}
