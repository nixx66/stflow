"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPublicClient, getAddress, http, type Hex } from "viem";
import { useAccount } from "wagmi";
import { arcTestnet } from "@/lib/chains";
import { hashInvoiceMetadata, type InvoiceMetadata } from "@/lib/invoiceMetadata";
import { fetchWalletInvoices } from "@/lib/onchainInvoices";
import type { ChainInvoice } from "@/lib/paymentTransaction";
import type { Invoice } from "@/types/invoice";

const client = createPublicClient({ chain: arcTestnet, transport: http() });

async function metadata(id: Hex) {
  const response = await fetch(`/api/v1/invoices/${id}`, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(
      response.status === 404
        ? `Verified metadata is unavailable for invoice ${id}.`
        : "Invoice metadata service is unavailable."
    );
  }
  const payload = (await response.json()) as {
    metadata?: InvoiceMetadata;
    metadataHash?: Hex;
  };
  if (!payload.metadata || payload.metadataHash !== hashInvoiceMetadata(payload.metadata)) {
    throw new Error(`Invoice ${id} metadata response is invalid.`);
  }
  return payload.metadata;
}

export function useInvoices() {
  const { address, isConnected } = useAccount();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string>();
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    setError(undefined);

    if (!isConnected || !address) {
      setInvoices([]);
      setIsReady(true);
      return;
    }

    setIsReady(false);
    try {
      const { INVOICE_REGISTRY_ADDRESS, invoiceRegistryAbi } = await import(
        "@/lib/contracts/invoiceRegistry"
      );
      const wallet = getAddress(address);
      const result = await fetchWalletInvoices(wallet, {
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
        metadata
      });
      if (request === generation.current) setInvoices(result);
    } catch (cause) {
      if (request === generation.current) {
        setInvoices([]);
        setError(cause instanceof Error ? cause.message : "Unable to load Arc invoices.");
      }
    } finally {
      if (request === generation.current) setIsReady(true);
    }
  }, [address, isConnected]);

  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
    };
  }, [refresh]);

  return { invoices, isReady, error, refresh };
}
