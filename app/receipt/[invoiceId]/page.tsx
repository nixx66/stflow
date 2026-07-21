"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { ReceiptCard } from "@/components/ReceiptCard";
import { buildReceipt } from "@/lib/invoice";
import { useInvoice } from "@/hooks/useInvoice";

export default function ReceiptPage() {
  const params = useParams<{ invoiceId: string }>();
  const { invoice, isReady } = useInvoice(params.invoiceId);
  const receipt = invoice ? buildReceipt(invoice) : null;

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-[1680px] px-3 py-10 sm:px-4 lg:px-6 2xl:px-8">
        {!isReady ? (
          <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
            <h1 className="text-2xl font-bold text-ink">Loading receipt...</h1>
            <p className="mt-3 text-sm text-muted">Reading the local STFlow mock ledger.</p>
          </div>
        ) : receipt ? (
          <ReceiptCard receipt={receipt} />
        ) : (
          <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
            <h1 className="text-2xl font-bold text-ink">Receipt not available</h1>
            <p className="mt-3 text-sm text-muted">
              The invoice must be paid before a receipt can be generated.
            </p>
            <Link
              className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-arc-600 px-5 text-sm font-semibold text-white"
              href={invoice ? `/pay/${invoice.id}` : "/dashboard"}
            >
              {invoice ? "Open Pay Page" : "Back to Dashboard"}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
