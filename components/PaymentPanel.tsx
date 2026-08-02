"use client";

import { ArrowRight, CheckCircle2, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isAddressEqual } from "viem";
import { getAddress } from "viem";
import { usePayInvoice } from "@/hooks/usePayInvoice";
import { ARC_TESTNET, getArcExplorerTxUrl } from "@/lib/arc";
import { ARC_BUSY_MESSAGE } from "@/lib/arcRpcRetry";
import { shortenAddress } from "@/lib/format";
import { formatUsdc } from "@/lib/paymentTransaction";
import { StatusBadge } from "./StatusBadge";
import { WalletStatusCard } from "./wallet/WalletStatusCard";

function stageMessage(stage: ReturnType<typeof usePayInvoice>["state"]["stage"]) {
  switch (stage) {
    case "checking":
      return "Checking onchain invoice and USDC balance";
    case "approval-signing":
      return "Approve the exact invoice amount in your wallet";
    case "approval-confirming":
      return "Confirming USDC approval on Arc Testnet";
    case "payment-signing":
      return "Confirm the invoice payment in your wallet";
    case "payment-confirming":
      return "Confirming invoice settlement on Arc Testnet";
    case "success":
      return "Payment confirmed onchain";
    case "error":
      return "Payment needs attention";
    default:
      return "Ready for onchain payment";
  }
}

export function PaymentPanel({ invoiceId }: { invoiceId: string }) {
  const router = useRouter();
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const {
    pay,
    refresh,
    state,
    invoice,
    metadata,
    isLoading,
    loadError,
    isSyncing,
    paymentTxHash,
    payerConnected,
    connectedAddress
  } = usePayInvoice(invoiceId);

  const retry = () => void refresh();

  useEffect(() => {
    if (!invoice || invoice.status !== 0 || BigInt(now) >= invoice.dueAt) return;
    const timer = window.setInterval(
      () => setNow(Math.floor(Date.now() / 1000)),
      1000
    );
    return () => window.clearInterval(timer);
  }, [invoice, now]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
        <h1 className="text-2xl font-bold text-ink">Loading invoice...</h1>
        <p className="mt-3 text-sm text-muted">Reading Arc Testnet settlement state.</p>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border border-slate-200 bg-white p-8 text-center shadow-card">
        <h1 className="text-2xl font-bold text-ink">Invoice not available</h1>
        <p className="mt-3 text-sm text-red-600">
          {loadError ?? ARC_BUSY_MESSAGE}
        </p>
        <button
          className="mt-4 text-sm font-semibold text-arc-700 underline"
          onClick={retry}
          type="button"
        >Retry</button>
      </div>
    );
  }

  const paymentConfirmed = invoice.status === 1 || state.stage === "success";
  const isPaid = paymentConfirmed;
  const isExpired = invoice.status === 0 && BigInt(now) >= invoice.dueAt;
  const isCancelled = invoice.status === 2;
  const isPaying = !["idle", "success", "error"].includes(state.stage);
  const correctPayer =
    connectedAddress && isAddressEqual(getAddress(connectedAddress), invoice.payer);
  const canPay =
    payerConnected &&
    correctPayer &&
    !paymentConfirmed &&
    invoice.status === 0 &&
    !isExpired &&
    !isPaying;
  const status = isPaid
    ? "paid"
    : isCancelled
      ? "cancelled"
      : isExpired
        ? "expired"
        : "pending";

  const buttonLabel = isPaid
    ? "Already Paid"
    : isCancelled
      ? "Invoice Cancelled"
      : isExpired
        ? "Invoice Expired"
        : !payerConnected
          ? "Connect payer wallet"
          : !correctPayer
            ? "Switch to assigned payer"
            : isPaying
              ? stageMessage(state.stage)
              : "Pay invoice on Arc Testnet";

  const handlePay = async () => {
    const result = await pay();
    if (result && "invoice" in result && !result.stale && result.reconciled) {
      window.setTimeout(
        () => router.push(`/receipt/${invoice.id}?tx=${result.txHash}`),
        700
      );
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
              {metadata?.title ?? "Onchain invoice"} / {shortenAddress(invoice.id, 8)}
            </p>
            <p className="mt-3 inline-flex rounded-full bg-arc-50 px-3 py-1 text-xs font-black text-arc-700">
              Arc Testnet · Registry settlement
            </p>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-6 rounded-lg bg-slate-50 p-5">
          <p className="text-sm text-muted">Amount</p>
          <p className="mt-1 text-4xl font-bold text-ink">
            {formatUsdc(invoice.amount)} USDC
          </p>
        </div>

        <dl className="mt-6 space-y-4 text-sm">
          <Row label="Merchant Account" value={shortenAddress(invoice.merchant)} />
          <Row label="Expected Payer" value={shortenAddress(invoice.payer)} />
          <Row label="Memo" value={metadata?.memo || "Metadata unavailable"} />
          <Row
            label="Status"
            value={
              isCancelled
                ? "Cancelled"
                : isExpired
                  ? "Expired"
                  : isPaid
                    ? "Paid"
                    : stageMessage(state.stage)
            }
          />
          <Row label="Network" value={`${ARC_TESTNET.name} (${ARC_TESTNET.chainId})`} />
        </dl>

        <button
          className="mt-8 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-arc-600 px-5 text-sm font-semibold text-white shadow-soft transition hover:bg-arc-500 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!canPay}
          onClick={handlePay}
          type="button"
        >
          {isPaying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
          {buttonLabel}
        </button>

        {!payerConnected ? (
          <Notice>Connect the payer wallet assigned onchain before paying.</Notice>
        ) : !correctPayer ? (
          <Notice>
            This invoice can only be paid by {shortenAddress(invoice.payer, 6)}.
          </Notice>
        ) : null}

        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            {paymentConfirmed ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <Loader2
                className={`h-5 w-5 text-arc-600 ${isPaying ? "animate-spin" : ""}`}
              />
            )}
            <p className="text-sm font-semibold text-ink">
              {paymentConfirmed
                ? "Payment confirmed on Arc Testnet"
                : stageMessage(state.stage)}
            </p>
          </div>
          {paymentConfirmed && isSyncing ? (
            <div className="mt-2">
              <p className="text-sm text-muted">链上数据正在同步</p>
              <button
                className="mt-2 text-sm font-semibold text-arc-700 underline"
                onClick={retry}
                type="button"
              >Retry</button>
            </div>
          ) : !paymentConfirmed && (state.error || loadError) ? (
            <div className="mt-2">
              <p className="text-sm text-red-600">{state.error ?? loadError}</p>
              <button
                className="mt-2 text-sm font-semibold text-arc-700 underline"
                onClick={retry}
                type="button"
              >Retry</button>
            </div>
          ) : null}
          {paymentTxHash ? (
            <a
              className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-arc-700 hover:text-arc-600"
              href={getArcExplorerTxUrl(paymentTxHash)}
              rel="noreferrer"
              target="_blank"
            >
              View transaction on Arcscan
              <ExternalLink className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="max-w-64 text-right font-medium text-ink">{value}</dd>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-800">
      {children}
    </div>
  );
}
