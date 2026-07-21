import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, shortenAddress } from "@/lib/format";
import { Invoice } from "@/types/invoice";
import { StatusBadge } from "./StatusBadge";

export function TransactionTable({ invoices }: { invoices: Invoice[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              {["Invoice ID", "Title", "Amount", "Status", "Created At", "Paid At", "Tx Hash", "Action"].map(
                (heading) => (
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.12em] text-slate-500"
                    key={heading}
                    scope="col"
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {invoices.map((invoice) => (
              <tr className="hover:bg-slate-50" key={invoice.id}>
                <td className="whitespace-nowrap px-4 py-4 font-medium text-ink">{invoice.id}</td>
                <td className="min-w-52 px-4 py-4 text-slate-700">{invoice.title}</td>
                <td className="whitespace-nowrap px-4 py-4 font-semibold text-ink">
                  {formatCurrency(invoice.amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <StatusBadge status={invoice.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-muted">
                  {formatDate(invoice.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-muted">
                  {formatDate(invoice.paidAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-muted">
                  {invoice.paymentTxHash ? shortenAddress(invoice.paymentTxHash) : "-"}
                </td>
                <td className="whitespace-nowrap px-4 py-4">
                  <Link
                    className="inline-flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-xs font-semibold text-arc-600 transition hover:bg-arc-50"
                    href={invoice.status === "paid" ? `/receipt/${invoice.id}` : `/pay/${invoice.id}`}
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                </td>
              </tr>
            ))}
            {invoices.length === 0 ? (
              <tr>
                <td className="px-4 py-12 text-center text-muted" colSpan={8}>
                  Create an invoice to see settlement records here.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
