import "server-only";

import { type Address, type Hex } from "viem";
import { createArcServerClient } from "./arcRpc.ts";
import { walletInvoiceIds } from "../onchainInvoices.ts";
import type { ChainInvoice } from "../paymentTransaction.ts";

export async function readWalletChainInvoices(wallet: Address) {
  const { INVOICE_REGISTRY_ADDRESS, invoiceRegistryAbi } = await import("../contracts/invoiceRegistry.ts");
  const client = createArcServerClient();
  const ids = await walletInvoiceIds(wallet, {
    count: (address) => client.readContract({
      address: INVOICE_REGISTRY_ADDRESS,
      abi: invoiceRegistryAbi,
      functionName: "invoiceCount",
      args: [address]
    }),
    page: (address, offset, limit) => client.readContract({
      address: INVOICE_REGISTRY_ADDRESS,
      abi: invoiceRegistryAbi,
      functionName: "getInvoiceIds",
      args: [address, offset, limit]
    })
  });
  return Promise.all(ids.map((id: Hex) => client.readContract({
    address: INVOICE_REGISTRY_ADDRESS,
    abi: invoiceRegistryAbi,
    functionName: "getInvoice",
    args: [id]
  }) as Promise<ChainInvoice>));
}
