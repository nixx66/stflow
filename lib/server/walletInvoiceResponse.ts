import { getAddress, isAddress, type Address, type Hex } from "viem";
import type { ChainInvoice } from "../paymentTransaction.ts";

export type SerializedChainInvoice = {
  id: Hex;
  merchant: Address;
  payer: Address;
  amount: string;
  createdAt: string;
  dueAt: string;
  paidAt: string;
  metadataHash: Hex;
  status: number;
};

type WalletInvoiceBody = {
  invoices?: SerializedChainInvoice[];
  code?: "INVALID_WALLET" | "ARC_RPC_UNAVAILABLE";
  error?: string;
};

const retryDelays = [250, 750] as const;

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readWithRetry(
  wallet: Address,
  read: (wallet: Address) => Promise<ChainInvoice[]>
) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await read(wallet);
    } catch (error) {
      const delay = retryDelays[attempt];
      if (delay === undefined) throw error;
      await wait(delay);
    }
  }
}

export async function walletInvoiceResponse(
  wallet: string,
  read: (wallet: Address) => Promise<ChainInvoice[]>
): Promise<{ status: number; body: WalletInvoiceBody }> {
  if (!isAddress(wallet, { strict: true })) {
    return {
      status: 400,
      body: { code: "INVALID_WALLET", error: "A valid wallet address is required." }
    };
  }
  try {
    const invoices = await readWithRetry(getAddress(wallet), read);
    return {
      status: 200,
      body: {
        invoices: invoices.map((invoice) => ({
          ...invoice,
          amount: invoice.amount.toString(),
          createdAt: invoice.createdAt.toString(),
          dueAt: invoice.dueAt.toString(),
          paidAt: invoice.paidAt.toString()
        }))
      }
    };
  } catch {
    return {
      status: 503,
      body: {
        code: "ARC_RPC_UNAVAILABLE",
        error: "Arc Testnet data is temporarily unavailable. Please try again."
      }
    };
  }
}
