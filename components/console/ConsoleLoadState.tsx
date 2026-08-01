"use client";

import type { InvoiceLoadStatus } from "@/hooks/useInvoice";

type ConsoleLoadStateProps = {
  status: InvoiceLoadStatus;
  refresh: () => Promise<void>;
  title: string;
};

export function ConsoleLoadState({ status, refresh, title }: ConsoleLoadStateProps) {
  const failed = status === "error";
  const message =
    status === "disconnected"
      ? "Connect a wallet to load its Arc Testnet invoice data."
      : status === "loading"
        ? "Loading Arc Testnet invoice data..."
        : "Arc Testnet data is temporarily unavailable. Please try again.";

  return (
    <section
      aria-live={failed ? "assertive" : "polite"}
      className={`rounded-[2rem] border p-6 shadow-card ${
        failed ? "border-red-200 bg-red-50 text-red-900" : "border-slate-200 bg-white text-ink"
      }`}
      role={failed ? "alert" : "status"}
    >
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mt-3 text-sm font-bold">{message}</p>
      {failed ? (
        <button className="mt-4 font-black underline" onClick={() => void refresh()} type="button">
          Retry
        </button>
      ) : null}
    </section>
  );
}
