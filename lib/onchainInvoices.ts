import { formatUnits, type Address, type Hex } from "viem";
import { ARC_TESTNET, ARC_USDC_ERC20_DECIMALS } from "./arc.ts";
import { hashInvoiceMetadata, type InvoiceMetadata } from "./invoiceMetadata.ts";
import type { ChainInvoice } from "./paymentTransaction.ts";
import type { Invoice } from "../types/invoice.ts";

const PAGE_SIZE = 100n;
const READ_CONCURRENCY = 5;

export type InvoiceReader = {
  count(wallet: Address): Promise<bigint>;
  page(wallet: Address, offset: bigint, limit: bigint): Promise<readonly Hex[]>;
  invoice?(id: Hex): Promise<ChainInvoice>;
  metadata?(id: Hex): Promise<InvoiceMetadata>;
};

export async function walletInvoiceIds(wallet: Address, reader: InvoiceReader) {
  const count = await reader.count(wallet);
  const ids: Hex[] = [];

  for (let offset = 0n; offset < count; offset += PAGE_SIZE) {
    const limit = count - offset > PAGE_SIZE ? PAGE_SIZE : count - offset;
    ids.push(...(await reader.page(wallet, offset, limit)));
  }

  return ids;
}

function status(invoice: ChainInvoice, now: bigint): Invoice["status"] {
  if (invoice.status === 1) return "paid";
  if (invoice.status === 2) return "cancelled";
  return invoice.dueAt <= now ? "expired" : "pending";
}

export function mapChainInvoice(
  chain: ChainInvoice,
  metadata: InvoiceMetadata,
  now = BigInt(Math.floor(Date.now() / 1000))
): Invoice {
  if (hashInvoiceMetadata(metadata) !== chain.metadataHash) {
    throw new Error(`Invoice ${chain.id} metadata hash mismatch.`);
  }

  return {
    id: chain.id,
    merchantWallet: chain.merchant,
    customerName: metadata.customerName,
    customerWallet: chain.payer,
    payerWallet: chain.status === 1 ? chain.payer : undefined,
    title: metadata.title,
    description: metadata.description,
    memo: metadata.memo,
    amount: formatUnits(chain.amount, ARC_USDC_ERC20_DECIMALS),
    currency: "USDC",
    status: status(chain, now),
    chainId: ARC_TESTNET.chainId,
    createdAt: new Date(Number(chain.createdAt) * 1000).toISOString(),
    paidAt: chain.paidAt ? new Date(Number(chain.paidAt) * 1000).toISOString() : undefined,
    expiresAt: new Date(Number(chain.dueAt) * 1000).toISOString()
  };
}

async function mapConcurrent<T, R>(
  values: readonly T[],
  concurrency: number,
  transform: (value: T) => Promise<R>
) {
  const results = new Array<R>(values.length);
  let cursor = 0;

  async function worker() {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await transform(values[index]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () => worker())
  );
  return results;
}

export async function fetchWalletInvoices(wallet: Address, reader: InvoiceReader) {
  if (!reader.invoice || !reader.metadata) {
    throw new Error("Invoice reader is incomplete.");
  }
  const ids = await walletInvoiceIds(wallet, reader);
  const now = BigInt(Math.floor(Date.now() / 1000));

  return mapConcurrent(ids, READ_CONCURRENCY, async (id) => {
    const [invoice, metadata] = await Promise.all([
      reader.invoice!(id),
      reader.metadata!(id)
    ]);
    if (invoice.id.toLowerCase() !== id.toLowerCase()) {
      throw new Error("Registry returned a different invoice ID.");
    }
    return mapChainInvoice(invoice, metadata, now);
  });
}
