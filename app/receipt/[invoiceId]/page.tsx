"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { isHash } from "viem";
import { Navbar } from "@/components/Navbar";
import { ReceiptCard } from "@/components/ReceiptCard";
import { usePayInvoice } from "@/hooks/usePayInvoice";

export default function ReceiptPage() {
  const params = useParams<{ invoiceId: string }>();
  const searchParams = useSearchParams();
  const transaction = searchParams.get("tx");
  const payment = usePayInvoice(
    params.invoiceId,
    transaction && isHash(transaction) ? transaction : undefined
  );
  const receiptReady = payment.invoice?.status === 1 && payment.invoice.paidAt > BigInt(0);

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-[1680px] px-3 py-10 sm:px-4 lg:px-6 2xl:px-8">
        {payment.isLoading ? (
          <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
            <h1 className="text-2xl font-bold text-ink">Loading receipt...</h1>
            <p className="mt-3 text-sm text-muted">Verifying Arc Testnet settlement state.</p>
          </div>
        ) : receiptReady && payment.invoice ? (
          <ReceiptCard
            invoice={payment.invoice}
            metadata={payment.metadata}
            paymentTxHash={payment.paymentTxHash}
          />
        ) : (
          <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
            <h1 className="text-2xl font-bold text-ink">Receipt not available</h1>
            <p className="mt-3 text-sm text-muted">
              {payment.loadError ?? "The invoice must be paid onchain before a receipt is available."}
            </p>
            <Link
              className="mt-6 inline-flex h-11 items-center justify-center rounded-md bg-arc-600 px-5 text-sm font-semibold text-white"
              href={payment.invoice ? `/pay/${payment.invoice.id}` : "/dashboard"}
            >
              {payment.invoice ? "Open Pay Page" : "Back to Dashboard"}
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
