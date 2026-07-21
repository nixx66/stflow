import { InvoiceStatus } from "@/types/invoice";

const styles: Record<InvoiceStatus, string> = {
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  expired: "bg-slate-100 text-slate-600 ring-slate-200"
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${styles[status]}`}
    >
      {status}
    </span>
  );
}
