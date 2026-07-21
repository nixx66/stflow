import { V2InvoiceStatus } from "@/types/v2";

const statusStyles: Record<V2InvoiceStatus, string> = {
  paid: "border-emerald-200 bg-emerald-50 text-emerald-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  draft: "border-slate-200 bg-slate-50 text-slate-600",
  archived: "border-slate-300 bg-white text-slate-500"
};

const statusLabels: Record<V2InvoiceStatus, string> = {
  paid: "Paid",
  pending: "Pending",
  draft: "Draft",
  archived: "Closed"
};

export function StatusPill({ status }: { status: V2InvoiceStatus }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyles[status]}`}>
      {statusLabels[status]}
    </span>
  );
}
