"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getAddress, type Address, type Hex } from "viem";
import { useAccount } from "wagmi";
import type { InvoiceMetadata } from "@/lib/invoiceMetadata";
import {
  fetchWalletInvoices,
  type MetadataResult
} from "@/lib/onchainInvoices";
import type { ChainInvoice } from "@/lib/paymentTransaction";
import type { SerializedChainInvoice } from "@/lib/server/walletInvoiceResponse";
import type { Invoice } from "@/types/invoice";

export type InvoiceLoadStatus =
  | "disconnected"
  | "loading"
  | "ready"
  | "partial"
  | "error";

async function metadataBatch(ids: readonly Hex[], signal?: AbortSignal) {
  const response = await fetch("/api/v1/invoices/metadata/batch", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ invoiceIds: ids }),
    cache: "no-store",
    signal
  });
  if (!response.ok) throw new Error("Invoice metadata service is unavailable.");
  const payload = (await response.json()) as {
    metadata?: Array<{
      invoiceId: Hex;
      metadataHash: Hex;
      metadata: InvoiceMetadata;
    }>;
  };
  const results = new Map<Hex, MetadataResult>();
  for (const row of payload.metadata ?? []) {
    results.set(row.invoiceId, {
      metadata: row.metadata,
      metadataHash: row.metadataHash
    });
  }
  return results;
}

function chainInvoice(invoice: SerializedChainInvoice): ChainInvoice {
  return {
    ...invoice,
    merchant: invoice.merchant as Address,
    payer: invoice.payer as Address,
    amount: BigInt(invoice.amount),
    createdAt: BigInt(invoice.createdAt),
    dueAt: BigInt(invoice.dueAt),
    paidAt: BigInt(invoice.paidAt)
  };
}

async function walletChainInvoices(wallet: Address, signal?: AbortSignal) {
  const response = await fetch(`/api/v1/invoices/wallet/${wallet}`, {
    cache: "no-store",
    signal
  });
  if (!response.ok) {
    throw new Error("Arc Testnet data is temporarily unavailable. Please try again.");
  }
  const payload = (await response.json()) as { invoices?: SerializedChainInvoice[] };
  return (payload.invoices ?? []).map(chainInvoice);
}

export function useInvoices() {
  const { address, isConnected } = useAccount();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [status, setStatus] = useState<InvoiceLoadStatus>("disconnected");
  const [error, setError] = useState<string>();
  const generation = useRef(0);
  const active = useRef<AbortController | undefined>(undefined);

  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    const request = ++generation.current;
    setError(undefined);

    if (!isConnected || !address) {
      setInvoices([]);
      setStatus("disconnected");
      return;
    }

    setInvoices([]);
    setStatus("loading");
    try {
      const wallet = getAddress(address);
      const chainInvoices = await walletChainInvoices(wallet, controller.signal);
      const byId = new Map(chainInvoices.map((invoice) => [invoice.id, invoice]));
      const result = await fetchWalletInvoices(
        wallet,
        {
          count: async () => BigInt(chainInvoices.length),
          page: async (_wallet, offset, limit) =>
            chainInvoices.slice(Number(offset), Number(offset + limit)).map((invoice) => invoice.id),
          invoice: async (id) => {
            const invoice = byId.get(id);
            if (!invoice) throw new Error("Invoice is unavailable.");
            return invoice;
          },
          metadataBatch
        },
        controller.signal
      );
      if (request !== generation.current || controller.signal.aborted) return;
      setInvoices(result);
      setStatus(
        result.some((invoice) => invoice.metadataState !== "verified")
          ? "partial"
          : "ready"
      );
    } catch {
      if (request !== generation.current || controller.signal.aborted) return;
      setInvoices([]);
      setStatus("error");
      setError("Arc Testnet data is temporarily unavailable. Please try again.");
    }
  }, [address, isConnected]);

  useEffect(() => {
    void refresh();
    return () => {
      active.current?.abort();
    };
  }, [refresh]);

  return {
    invoices,
    status,
    isReady: status === "ready" || status === "partial",
    error,
    refresh
  };
}
