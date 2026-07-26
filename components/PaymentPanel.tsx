"use client";

import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { formatCurrency, shortenAddress } from "@/lib/format";
import {
  getInvoiceStatus,
  getPayerAuthorization,
  getPaymentEligibility
} from "@/lib/invoiceStatus";
import { getPaymentButtonLabel, getPaymentModeLabel } from "@/lib/paymentMode";
import { usePayInvoice } from "@/hooks/usePayInvoice";
import { Invoice } from "@/types/invoice";
import { StatusBadge } from "./StatusBadge";
import { WalletStatusCard } from "./wallet/WalletStatusCard";

function stageMessage(stage: ReturnType<typeof usePayInvoice>["stage"]) {
  switch (stage) {
    case "wallet":
      return "Authorizing mock USDC payment...";
    case "submitted":
      return "Transaction submitted...";
    case "confirming":
      return "Confirming settlement state...";
    case "success":
      return "Payment successful";
    case "error":
      return "Payment needs attention";
    default:
      return "Ready for mock payment authorization";
  }
}

export function PaymentPanel({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const { address: connectedPayerWallet } = useAccount();
  const [now, setNow] = useState(() => new Date());
  const {
    pay,
    stage,
    txHash,
    error,
    paymentMode,
    livePayment,
    payerConnected,
    payerChainId
  } = usePayInvoice(invoice);
  const expiresAt = invoice.expiresAt;
  const expiresAtTime = expiresAt ? new Date(expiresAt).getTime() : Number.NaN;
  const expiryCanChange =
    invoice.status === "pending" &&
    !Number.isNaN(expiresAtTime) &&
    expiresAtTime > now.getTime();

  useEffect(() => {
    if (!expiryCanChange) return;
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, [expiryCanChange]);

  const effectiveStatus = getInvoiceStatus(invoice, now);
  const paymentEligibility = getPaymentEligibility(invoice, now);
  const isPaid = effectiveStatus === "paid";
  const isExpired = effectiveStatus === "expired";
  const isPaying = !["idle", "success", "error"].includes(stage);
  const requiresWallet = livePayment && !payerConnected;
  const payerAuthorization = livePayment
    ? getPayerAuthorization(invoice, connectedPayerWallet)
    : { canPay: true, reason: null, expectedWallet: invoice.customerWallet };
  const canSubmitPayment = paymentEligibility.canPay && !requiresWallet && payerAuthorization.canPay;

  const payerGuardMessage =
    payerAuthorization.reason === "merchant_wallet"
      ? "This merchant wallet created the invoice. Send the payment link to the payer wallet to complete checkout."
      : payerAuthorization.reason === "wrong_payer_wallet"
        ? `This checkout is assigned to ${shortenAddress(payerAuthorization.expectedWallet ?? "", 6)}. Switch to that payer wallet before paying.`
        : payerAuthorization.reason === "wallet_required"
          ? "Connect the payer wallet assigned to this invoice before paying."
          : null;

  const buttonLabel =
    isExpired
      ? "Invoice Expired"
      : isPaid
        ? "Already Paid"
        : payerAuthorization.reason === "merchant_wallet"
          ? "Merchant wallet cannot pay"
          : payerAuthorization.reason === "wrong_payer_wallet"
            ? "Switch to payer wallet"
            : requiresWallet || payerAuthorization.reason === "wallet_required"
              ? "Connect payer wallet"
              : getPaymentButtonLabel(paymentMode);

  const handlePay = async () => {
    if (!canSubmitPayment) return;

    const paidInvoice = await pay();
    if (paidInvoice) {
      setTimeout(() => router.push(`/receipt/${invoice.id}`), 700);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <WalletStatusCard audience="payer" />

      <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-card sm:p-8">
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <p className="text-sm font-semibold text-arc-600">STFlow Checkout</p>
          <h1 className="mt-2 text-2xl font-bold text-ink">Pay USDC invoice</h1>
          <p className="mt-2 text-sm text-muted">
            {invoice.title} / {invoice.id}
          </p>
          <p className="mt-3 inline-flex rounded-full bg-arc-50 px-3 py-1 text-xs font-black text-arc-700">
            {getPaymentModeLabel(paymentMode)}
          </p>
        </div>
        <StatusBadge status={effectiveStatus} />
      </div>

      <div className="mt-6 rounded-lg bg-slate-50 p-5">
        <p className="text-sm text-muted">Amount</p>
        <p className="mt-1 text-4xl font-bold text-ink">{formatCurrency(invoice.amount)}</p>
      </div>

      <dl className="mt-6 space-y-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Merchant Account</dt>
          <dd className="font-medium text-ink">{shortenAddress(invoice.merchantWallet)}</dd>
        </div>
        {invoice.customerWallet ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Expected Payer</dt>
            <dd className="font-medium text-ink">{shortenAddress(invoice.customerWallet)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Memo</dt>
          <dd className="max-w-56 text-right font-medium text-ink">{invoice.memo || "-"}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted">Status</dt>
          <dd className="font-medium text-ink">{isExpired ? "Expired" : isPaid ? "Paid" : stageMessage(stage)}</dd>
        </div>
        {livePayment ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Payer Network</dt>
            <dd className="font-medium text-ink">
              {payerConnected ? `Chain ${payerChainId}` : "Wallet not connected"}
            </dd>
          </div>
        ) : null}
        {txHash ? (
          <div className="flex justify-between gap-4">
            <dt className="text-muted">{livePayment ? "Live Tx Hash" : "Mock Tx Hash"}</dt>
            <dd className="font-medium text-ink">{shortenAddress(txHash)}</dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-8 space-y-3">
        <button
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-arc-600 px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-arc-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={isPaying || !canSubmitPayment}
          onClick={handlePay}
          type="button"
        >
          {isPaying ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {buttonLabel}
        </button>
      </div>

      {payerGuardMessage ? (
        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
          {payerGuardMessage}
        </div>
      ) : null}

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          {stage === "success" || isPaid ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Loader2
              className={`h-5 w-5 text-arc-600 ${isPaying ? "animate-spin" : ""}`}
            />
          )}
          <p className="text-sm font-semibold text-ink">
            {isExpired
              ? "Invoice expired. Create a new payment link."
              : isPaid
                ? "Payment successful"
                : livePayment
                  ? "Real payment mode is enabled for this checkout."
                  : stageMessage(stage)}
          </p>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
      </div>
    </div>
  );
}
