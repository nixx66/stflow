import { Download, FileText } from "lucide-react";
import { DataPanel } from "@/components/console/DataPanel";
import { ExportCsvButton } from "@/components/console/ExportCsvButton";
import { StatusPill } from "@/components/console/StatusPill";
import { getV2CustomerName, v2Invoices } from "@/lib/v2MockData";

export default function ConsoleExportPage() {
  const pdfReady = v2Invoices.filter((invoice) => invoice.pdfReceipt);

  return (
    <div className="space-y-6">
      <DataPanel
        action={<ExportCsvButton />}
        eyebrow="Export center"
        title="CSV and PDF receipt outputs"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl bg-slate-50 p-5">
            <Download className="h-5 w-5 text-arc-600" />
            <p className="mt-4 text-2xl font-black text-ink">CSV export</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">Download all V2 invoice records for finance review and settlement reconciliation.</p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-5">
            <FileText className="h-5 w-5 text-arc-600" />
            <p className="mt-4 text-2xl font-black text-ink">{pdfReady.length}</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-muted">Invoices have PDF receipt data ready for a formal commercial receipt flow.</p>
          </div>
          <div className="rounded-3xl bg-ink p-5 text-white">
            <p className="text-sm font-bold text-arc-100">Next V2 step</p>
            <p className="mt-4 text-2xl font-black">Server PDF renderer</p>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-300">Keep mock receipt data now, wire generated PDFs after the receipt copy is final.</p>
          </div>
        </div>
      </DataPanel>

      <DataPanel eyebrow="Receipt queue" title="PDF-ready paid invoices">
        <div className="space-y-3">
          {pdfReady.map((invoice) => (
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between" key={invoice.id}>
              <div>
                <p className="font-black text-ink">{invoice.id}</p>
                <p className="mt-1 text-sm font-semibold text-muted">{getV2CustomerName(invoice.customerId)} / {invoice.title}</p>
              </div>
              <StatusPill status={invoice.status} />
            </div>
          ))}
        </div>
      </DataPanel>
    </div>
  );
}
