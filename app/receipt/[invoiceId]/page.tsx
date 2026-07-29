"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { isHash } from "viem";
import { Navbar } from "@/components/Navbar";
import { ReceiptCard } from "@/components/ReceiptCard";
import { usePayInvoice } from "@/hooks/usePayInvoice";

export default function ReceiptPage() {
  const params = useParams<{ invoiceId: string }>();
  return <ReceiptContent invoiceId={params.invoiceId} key={params.invoiceId.toLowerCase()} />;
}

function ReceiptContent({ invoiceId }: { invoiceId: string }) {
  const searchParams = useSearchParams();
  const transaction = searchParams.get("tx");
  const payment = usePayInvoice(
    invoiceId,
    transaction && isHash(transaction) ? transaction : undefined
  );
  const receiptReady = payment.invoice?.status === 1 && payment.invoice.paidAt > BigInt(0);
  const proofReady =
    payment.proof?.status === "verified" && Boolean(payment.paymentTxHash);
  const verifying =
    payment.isLoading || (receiptReady && payment.proof?.status === "loading");

  return (
    <main>
      <Navbar />
      <section className="mx-auto max-w-[1680px] px-3 py-10 sm:px-4 lg:px-6 2xl:px-8">
        {verifying ? (
          <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
            <h1 className="text-2xl font-bold text-ink">Loading receipt...</h1>
            <p className="mt-3 text-sm text-muted">Verifying Arc Testnet settlement state.</p>
          </div>
        ) : receiptReady &&
          proofReady &&
          payment.invoice &&
          payment.proof?.status === "verified" ? (
          <ReceiptCard
            invoice={payment.invoice}
            metadata={payment.metadata}
            proof={payment.proof}
          />
        ) : (
          <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
            <h1 className="text-2xl font-bold text-ink">Receipt not available</h1>
            <p className="mt-3 text-sm text-muted">
              {payment.proof?.status === "error"
                ? payment.proof.error
                : payment.loadError ??
                  "The invoice must be paid and its transaction proof verified before a receipt is available."}
            </p>
            {receiptReady ? (
              <button
                className="mt-6 mr-3 inline-flex h-11 items-center justify-center rounded-md border border-arc-600 px-5 text-sm font-semibold text-arc-700"
                onClick={() => void payment.refresh()}
                type="button"
              >
                Retry verification
              </button>
            ) : null}
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
