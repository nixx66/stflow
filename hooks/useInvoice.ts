"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPublicClient, getAddress, http, type Hex } from "viem";
import { useAccount } from "wagmi";
import { arcTestnet } from "@/lib/chains";
import type { InvoiceMetadata } from "@/lib/invoiceMetadata";
import {
  fetchWalletInvoices,
  type MetadataResult
} from "@/lib/onchainInvoices";
import type { ChainInvoice } from "@/lib/paymentTransaction";
import type { Invoice } from "@/types/invoice";

const client = createPublicClient({ chain: arcTestnet, transport: http() });

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
      const { INVOICE_REGISTRY_ADDRESS, invoiceRegistryAbi } = await import(
        "@/lib/contracts/invoiceRegistry"
      );
      const wallet = getAddress(address);
      const result = await fetchWalletInvoices(
        wallet,
        {
          count: () =>
            client.readContract({
              address: INVOICE_REGISTRY_ADDRESS,
              abi: invoiceRegistryAbi,
              functionName: "invoiceCount",
              args: [wallet]
            }),
          page: (_wallet, offset, limit) =>
            client.readContract({
              address: INVOICE_REGISTRY_ADDRESS,
              abi: invoiceRegistryAbi,
              functionName: "getInvoiceIds",
              args: [wallet, offset, limit]
            }),
          invoice: (id) =>
            client.readContract({
              address: INVOICE_REGISTRY_ADDRESS,
              abi: invoiceRegistryAbi,
              functionName: "getInvoice",
              args: [id]
            }) as Promise<ChainInvoice>,
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
    } catch (cause) {
      if (request !== generation.current || controller.signal.aborted) return;
      setInvoices([]);
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Unable to load Arc invoices.");
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
