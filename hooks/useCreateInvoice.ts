"use client";

import { useCallback, useReducer } from "react";
import {
  getBytecode,
  switchChain,
  waitForTransactionReceipt,
  writeContract
} from "wagmi/actions";
import { getAddress, isAddress, type Address, type Hex } from "viem";
import { useAccount, useConfig } from "wagmi";
import { ARC_TESTNET } from "@/lib/arc";
import {
  createReferenceId,
  parseInvoiceAmount,
  parseInvoiceDeadline,
  reduceCreateState,
  validateInvoiceCreated,
  type CreateState
} from "@/lib/invoiceCreateTransaction";
import {
  hashInvoiceMetadata,
  invoiceIdFromReference,
  type InvoiceMetadata
} from "@/lib/invoiceMetadata";
import type { Invoice } from "@/types/invoice";

const initialState: CreateState = { stage: "idle" };

export type CreateInvoiceInput = InvoiceMetadata & {
  payer: Address;
  amount: string;
  expiresAt: string;
};

export type CreateInvoiceResult = {
  invoice: Invoice;
  txHash: Hex;
  metadataPending: boolean;
};

export function getInvoiceCreateConfigError() {
  const registry = process.env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS;

  if (!registry || !isAddress(registry, { strict: true })) {
    return "Invoice registry is not configured.";
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return "Invoice metadata database is not configured.";
  }

  return undefined;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unable to create the invoice.";
}

async function persistMetadata(invoice: Invoice, referenceId: Hex, metadataHash: Hex) {
  const response = await fetch("/api/v1/invoices/metadata", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ invoice, referenceId, metadataHash })
  });

  if (!response.ok) {
    throw new Error("Onchain invoice created, but metadata save is pending.");
  }
}

export function useCreateInvoice() {
  const config = useConfig();
  const { address, chainId, isConnected } = useAccount();
  const [state, dispatch] = useReducer(reduceCreateState, initialState);
  const configError = getInvoiceCreateConfigError();

  const createInvoice = useCallback(
    async (input: CreateInvoiceInput): Promise<CreateInvoiceResult> => {
      if (configError) throw new Error(configError);
      if (!isConnected || !address) {
        throw new Error("Connect the merchant wallet before creating an invoice.");
      }

      const merchant = getAddress(address);
      const payer = getAddress(input.payer);
      const amount = parseInvoiceAmount(input.amount);
      const dueAt = parseInvoiceDeadline(input.expiresAt);

      if (merchant === payer) {
        throw new Error("Payer wallet must be different from the merchant wallet.");
      }

      const metadata = {
        customerName: input.customerName,
        title: input.title,
        description: input.description,
        memo: input.memo
      };
      const metadataHash = hashInvoiceMetadata(metadata);
      const referenceId = createReferenceId();
      const id = invoiceIdFromReference(merchant, referenceId);

      dispatch({ type: "wallet_requested" });

      try {
        if (chainId !== ARC_TESTNET.chainId) {
          await switchChain(config, { chainId: ARC_TESTNET.chainId });
        }

        const { INVOICE_REGISTRY_ADDRESS, invoiceRegistryAbi } = await import(
          "@/lib/contracts/invoiceRegistry"
        );
        const code = await getBytecode(config, {
          address: INVOICE_REGISTRY_ADDRESS,
          chainId: ARC_TESTNET.chainId
        });

        if (!code || code === "0x") {
          throw new Error("Invoice registry is not deployed on Arc Testnet.");
        }

        const txHash = await writeContract(config, {
          abi: invoiceRegistryAbi,
          address: INVOICE_REGISTRY_ADDRESS,
          account: merchant,
          chainId: ARC_TESTNET.chainId,
          functionName: "createInvoice",
          args: [referenceId, payer, amount, dueAt, metadataHash]
        });
        dispatch({ type: "hash_received", txHash });

        const receipt = await waitForTransactionReceipt(config, {
          chainId: ARC_TESTNET.chainId,
          hash: txHash
        });
        const created = validateInvoiceCreated(receipt, INVOICE_REGISTRY_ADDRESS, {
          id,
          merchant,
          payer,
          amount,
          dueAt,
          metadataHash
        });
        dispatch({ type: "receipt_confirmed", invoice: created });

        const invoice: Invoice = {
          id,
          merchantWallet: merchant,
          customerName: metadata.customerName.trim(),
          customerWallet: payer,
          title: metadata.title.trim(),
          description: metadata.description.trim(),
          memo: metadata.memo.trim(),
          amount: input.amount.trim(),
          currency: "USDC",
          status: "pending",
          chainId: ARC_TESTNET.chainId,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Number(dueAt) * 1000).toISOString(),
          creationTxHash: txHash
        };

        try {
          await persistMetadata(invoice, referenceId, metadataHash);
          dispatch({ type: "metadata_saved" });
          return { invoice, txHash, metadataPending: false };
        } catch (error) {
          dispatch({ type: "metadata_failed", error: errorMessage(error) });
          return { invoice, txHash, metadataPending: true };
        }
      } catch (error) {
        dispatch({ type: "failed", error: errorMessage(error) });
        throw error;
      }
    },
    [address, chainId, config, configError, isConnected]
  );

  return {
    createInvoice,
    configError,
    state
  };
}
