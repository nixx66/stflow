import "server-only";

import { createPublicClient, http, type Address, type Hex } from "viem";
import { arcTestnet } from "../chains.ts";
import { walletInvoiceIds } from "../onchainInvoices.ts";
import type { ChainInvoice } from "../paymentTransaction.ts";

const client = createPublicClient({ chain: arcTestnet, transport: http(arcTestnet.rpcUrls.default.http[0]) });

export async function readWalletChainInvoices(wallet: Address) {
  const { INVOICE_REGISTRY_ADDRESS, invoiceRegistryAbi } = await import("../contracts/invoiceRegistry.ts");
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
