import { formatUnits, type Address, type Hex } from "viem";
import { ARC_TESTNET, ARC_USDC_ERC20_DECIMALS } from "./arc.ts";
import { hashInvoiceMetadata, type InvoiceMetadata } from "./invoiceMetadata.ts";
import type { ChainInvoice } from "./paymentTransaction.ts";
import type { Invoice } from "../types/invoice.ts";

const PAGE_SIZE = 100n;
const MAX_WALLET_INVOICES = 1000n;
const READ_CONCURRENCY = 5;
const METADATA_BATCH_SIZE = 100;

export type MetadataResult = {
  metadata: InvoiceMetadata;
  metadataHash?: Hex;
};

export type InvoiceReader = {
  count(wallet: Address): Promise<bigint>;
  page(wallet: Address, offset: bigint, limit: bigint): Promise<readonly Hex[]>;
  invoice?(id: Hex): Promise<ChainInvoice>;
  metadata?(id: Hex): Promise<InvoiceMetadata>;
  metadataBatch?(ids: readonly Hex[], signal?: AbortSignal): Promise<Map<Hex, MetadataResult>>;
};

function abort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException("Invoice load aborted.", "AbortError");
}

export async function walletInvoiceIds(
  wallet: Address,
  reader: InvoiceReader,
  signal?: AbortSignal
) {
  abort(signal);
  const count = await reader.count(wallet);
  if (count > MAX_WALLET_INVOICES) {
    throw new Error(`Wallet invoice count exceeds the operational limit of ${MAX_WALLET_INVOICES}.`);
  }
  const ids: Hex[] = [];

  for (let offset = 0n; offset < count; offset += PAGE_SIZE) {
    abort(signal);
    const limit = count - offset > PAGE_SIZE ? PAGE_SIZE : count - offset;
    ids.push(...(await reader.page(wallet, offset, limit)));
  }
  return ids;
}

function status(invoice: ChainInvoice, now: bigint): Invoice["status"] {
  if (invoice.status === 0) return invoice.dueAt <= now ? "expired" : "pending";
  if (invoice.status === 1) return "paid";
  if (invoice.status === 2) return "cancelled";
  throw new Error(`Unknown invoice status ${invoice.status}.`);
}

export function mapChainInvoice(
  chain: ChainInvoice,
  metadata?: InvoiceMetadata,
  now = BigInt(Math.floor(Date.now() / 1000)),
  metadataState: Invoice["metadataState"] = metadata ? "verified" : "missing"
): Invoice {
  if (metadata && hashInvoiceMetadata(metadata) !== chain.metadataHash) {
    throw new Error(`Invoice ${chain.id} metadata hash mismatch.`);
  }
  return {
    id: chain.id,
    merchantWallet: chain.merchant,
    customerName: metadata?.customerName,
    customerWallet: chain.payer,
    payerWallet: chain.status === 1 ? chain.payer : undefined,
    title: metadata?.title,
    description: metadata?.description,
    memo: metadata?.memo,
    amount: formatUnits(chain.amount, ARC_USDC_ERC20_DECIMALS),
    currency: "USDC",
    status: status(chain, now),
    chainId: ARC_TESTNET.chainId,
    createdAt: new Date(Number(chain.createdAt) * 1000).toISOString(),
    paidAt: chain.paidAt ? new Date(Number(chain.paidAt) * 1000).toISOString() : undefined,
    expiresAt: new Date(Number(chain.dueAt) * 1000).toISOString(),
    metadataState
  };
}

export function metadataBatches(ids: readonly Hex[]) {
  const batches: Hex[][] = [];
  for (let offset = 0; offset < ids.length; offset += METADATA_BATCH_SIZE) {
    batches.push(ids.slice(offset, offset + METADATA_BATCH_SIZE));
  }
  return batches;
}

async function mapConcurrent<T, R>(
  values: readonly T[],
  transform: (value: T) => Promise<R>,
  signal?: AbortSignal
) {
  const results = new Array<R>(values.length);
  let cursor = 0;
  async function worker() {
    while (cursor < values.length) {
      abort(signal);
      const index = cursor++;
      results[index] = await transform(values[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(READ_CONCURRENCY, values.length) }, () => worker())
  );
  return results;
}

export async function fetchWalletInvoices(
  wallet: Address,
  reader: InvoiceReader,
  signal?: AbortSignal
) {
  if (!reader.invoice || (!reader.metadata && !reader.metadataBatch)) {
    throw new Error("Invoice reader is incomplete.");
  }
  const ids = await walletInvoiceIds(wallet, reader, signal);
  const chainInvoices = await mapConcurrent(ids, async (id) => {
    const invoice = await reader.invoice!(id);
    if (invoice.id.toLowerCase() !== id.toLowerCase()) {
      throw new Error("Registry returned a different invoice ID.");
    }
    return invoice;
  }, signal);
  abort(signal);

  const now = BigInt(Math.floor(Date.now() / 1000));
  if (!reader.metadataBatch) {
    return mapConcurrent(chainInvoices, async (invoice) => {
      const metadata = await reader.metadata!(invoice.id);
      return mapChainInvoice(invoice, metadata, now);
    }, signal);
  }

  const metadata = new Map<Hex, MetadataResult>();
  let serviceError = false;
  for (const batch of metadataBatches(ids)) {
    abort(signal);
    try {
      for (const [id, result] of await reader.metadataBatch(batch, signal)) {
        metadata.set(id, result);
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      serviceError = true;
    }
  }

  return chainInvoices.map((invoice) => {
    const result = metadata.get(invoice.id);
    if (!result) return mapChainInvoice(invoice, undefined, now, serviceError ? "error" : "missing");
    if (
      (result.metadataHash && result.metadataHash !== invoice.metadataHash) ||
      hashInvoiceMetadata(result.metadata) !== invoice.metadataHash
    ) {
      return mapChainInvoice(invoice, undefined, now, "invalid");
    }
    return mapChainInvoice(invoice, result.metadata, now, "verified");
  });
}
