"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { PaymentPanel } from "@/components/PaymentPanel";
import { useInvoice } from "@/hooks/useInvoice";
import { SHARED_INVOICE_PARAM } from "@/lib/sharedInvoiceLink";

export default function PayInvoicePage() {
  const params = useParams<{ invoiceId: string }>();
  const searchParams = useSearchParams();
  const { invoice, isReady } = useInvoice(params.invoiceId, searchParams.get(SHARED_INVOICE_PARAM));

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-[1680px] px-3 py-10 sm:px-4 lg:px-6 2xl:px-8">
        {!isReady ? (
          <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
            <h1 className="text-2xl font-bold text-ink">Loading invoice...</h1>
            <p className="mt-3 text-sm text-muted">Reading the local STFlow mock ledger.</p>
          </div>
        ) : invoice ? (
          <PaymentPanel invoice={invoice} />
        ) : (
          <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
            <h1 className="text-2xl font-bold text-ink">Invoice not found</h1>
            <p className="mt-3 text-sm text-muted">
              This payment link does not include an invoice record that this browser can read.
            </p>
            <Link
              className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-arc-600 px-5 text-sm font-semibold text-white"
              href="/invoice/new"
            >
              Create Invoice
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
