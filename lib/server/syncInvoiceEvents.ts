import { createHash, timingSafeEqual } from "node:crypto";
import {
  createPublicClient,
  getAddress,
  http,
  type Address,
  type Hex
} from "viem";
import { ARC_TESTNET } from "../arc.ts";

const MAX_BLOCKS = 2000n;
const MAX_CONFIRMATIONS = 1000n;
const invoiceEvents = [
  {
    type: "event",
    name: "InvoiceCreated",
    anonymous: false,
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "merchant", type: "address", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint128", indexed: false },
      { name: "dueAt", type: "uint64", indexed: false },
      { name: "metadataHash", type: "bytes32", indexed: false }
    ]
  },
  {
    type: "event",
    name: "InvoicePaid",
    anonymous: false,
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "merchant", type: "address", indexed: true },
      { name: "amount", type: "uint128", indexed: false }
    ]
  },
  {
    type: "event",
    name: "InvoiceCancelled",
    anonymous: false,
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "merchant", type: "address", indexed: true }
    ]
  }
] as const;

export class SyncConfigError extends Error {
  constructor() {
    super("Invalid chain synchronization configuration.");
    this.name = "SyncConfigError";
  }
}

export class ReorgError extends Error {
  constructor() {
    super("The stored chain cursor no longer matches Arc.");
    this.name = "ReorgError";
  }
}

export class SyncDatabaseError extends Error {
  constructor() {
    super("Chain synchronization database operation failed.");
    this.name = "SyncDatabaseError";
  }
}

export type SyncConfig = Readonly<{
  deploymentBlock: bigint;
  confirmationDepth: bigint;
  cronSecret?: string;
}>;

type Cursor = Readonly<{ blockNumber: bigint; blockHash: Hex }>;
type ChainBlock = Readonly<{
  number: bigint;
  hash: Hex;
  timestamp: bigint;
}>;

type EventBase = Readonly<{
  invoiceId: Hex;
  txHash: Hex;
  blockHash: Hex;
  blockNumber: bigint;
  transactionIndex: number;
  logIndex: number;
  blockTimestamp: string;
}>;

export type ChainEvent =
  | (EventBase & {
      eventName: "InvoiceCreated";
      merchant: Address;
      payer: Address;
      amountRaw: string;
      dueChainAt: string;
      metadataHash: Hex;
    })
  | (EventBase & {
      eventName: "InvoicePaid";
      merchant: Address;
      payer: Address;
      amountRaw: string;
    })
  | (EventBase & {
      eventName: "InvoiceCancelled";
      merchant: Address;
    });

export type SyncDependencies = Readonly<{
  chain: {
    getBlockNumber(): Promise<bigint>;
    getBlock(input: { blockNumber: bigint }): Promise<ChainBlock>;
    getLogs(input: {
      fromBlock: bigint;
      toBlock: bigint;
    }): Promise<readonly unknown[]>;
  };
  db: {
    getCursor(): Promise<Cursor | null>;
    initializeCursor(input: Cursor): Promise<"initialized" | "existing">;
    applyBatch(input: {
      expectedCursor: Cursor;
      fromBlock: bigint;
      toBlock: bigint;
      toBlockHash: Hex;
      events: readonly ChainEvent[];
    }): Promise<"applied" | "idempotent">;
  };
  decodeLogs(logs: readonly unknown[]): Promise<readonly ChainEvent[]>;
}>;

type MetadataProjection =
  | Readonly<{ indexedStatus: "pending" }>
  | Readonly<{
      indexedStatus: "paid";
      paidChainAt: string;
      paymentTxHash: Hex;
      paymentBlockNumber: bigint;
      paymentLogIndex: number;
    }>
  | Readonly<{
      indexedStatus: "cancelled";
      cancelledChainAt: string;
      cancellationTxHash: Hex;
      cancellationBlockNumber: bigint;
      cancellationLogIndex: number;
    }>;

function decimal(value: string | undefined, min: bigint, max: bigint) {
  if (!value || !/^(0|[1-9][0-9]*)$/.test(value)) return null;
  const parsed = BigInt(value);
  return parsed >= min && parsed <= max ? parsed : null;
}

export function parseSyncConfig(
  env: Record<string, string | undefined>
): SyncConfig & { cronSecret: string } {
  const deploymentBlock = decimal(
    env.INVOICE_REGISTRY_DEPLOYMENT_BLOCK,
    0n,
    BigInt(Number.MAX_SAFE_INTEGER)
  );
  const confirmationDepth = decimal(
    env.ARC_CONFIRMATION_DEPTH ?? "12",
    1n,
    MAX_CONFIRMATIONS
  );
  const cronSecret = env.CRON_SECRET;
  if (
    deploymentBlock === null ||
    confirmationDepth === null ||
    !cronSecret ||
    cronSecret.length < 32 ||
    cronSecret.length > 512 ||
    /\s/.test(cronSecret)
  ) {
    throw new SyncConfigError();
  }
  return Object.freeze({ deploymentBlock, confirmationDepth, cronSecret });
}

export function authorizeCron(header: string | null, secret: string) {
  const supplied =
    header?.startsWith("Bearer ") && header.length > 7 ? header.slice(7) : "";
  const expectedHash = createHash("sha256").update(secret).digest();
  const suppliedHash = createHash("sha256").update(supplied).digest();
  return timingSafeEqual(expectedHash, suppliedHash) && supplied.length > 0;
}

function sameInvoice(
  created: Extract<ChainEvent, { eventName: "InvoiceCreated" }>,
  terminal: Exclude<ChainEvent, { eventName: "InvoiceCreated" }>
) {
  return (
    created.invoiceId === terminal.invoiceId &&
    created.merchant === terminal.merchant &&
    (terminal.eventName !== "InvoicePaid" ||
      (created.payer === terminal.payer &&
        created.amountRaw === terminal.amountRaw))
  );
}

export function projectMetadataStatus(
  created: Extract<ChainEvent, { eventName: "InvoiceCreated" }>,
  terminal?: Exclude<ChainEvent, { eventName: "InvoiceCreated" }>
): MetadataProjection {
  if (!terminal) return { indexedStatus: "pending" };
  if (!sameInvoice(created, terminal)) {
    throw new Error("Chain event conflict.");
  }
  if (terminal.eventName === "InvoicePaid") {
    return {
      indexedStatus: "paid",
      paidChainAt: terminal.blockTimestamp,
      paymentTxHash: terminal.txHash,
      paymentBlockNumber: terminal.blockNumber,
      paymentLogIndex: terminal.logIndex
    };
  }
  return {
    indexedStatus: "cancelled",
    cancelledChainAt: terminal.blockTimestamp,
    cancellationTxHash: terminal.txHash,
    cancellationBlockNumber: terminal.blockNumber,
    cancellationLogIndex: terminal.logIndex
  };
}

function orderEvents(left: ChainEvent, right: ChainEvent) {
  if (left.blockNumber !== right.blockNumber) {
    return left.blockNumber < right.blockNumber ? -1 : 1;
  }
  if (left.transactionIndex !== right.transactionIndex) {
    return left.transactionIndex - right.transactionIndex;
  }
  return left.logIndex - right.logIndex;
}

export async function syncInvoiceEvents(
  config: Omit<SyncConfig, "cronSecret">,
  deps: SyncDependencies
) {
  let cursor = await deps.db.getCursor();
  if (!cursor) {
    if (config.deploymentBlock === 0n) {
      throw new SyncConfigError();
    }
    const initialBlock = config.deploymentBlock - 1n;
    const canonical = await deps.chain.getBlock({ blockNumber: initialBlock });
    await deps.db.initializeCursor({
      blockNumber: initialBlock,
      blockHash: canonical.hash
    });
    cursor = await deps.db.getCursor();
    if (!cursor) {
      cursor = { blockNumber: initialBlock, blockHash: canonical.hash };
    }
  }

  const cursorBlock = await deps.chain.getBlock({
    blockNumber: cursor.blockNumber
  });
  if (cursorBlock.hash.toLowerCase() !== cursor.blockHash.toLowerCase()) {
    throw new ReorgError();
  }

  const head = await deps.chain.getBlockNumber();
  if (head < config.confirmationDepth) {
    return { processed: 0, fromBlock: null, toBlock: null };
  }
  const confirmedHead = head - config.confirmationDepth;
  const fromBlock = cursor.blockNumber + 1n;
  if (fromBlock > confirmedHead) {
    return { processed: 0, fromBlock: null, toBlock: null };
  }
  const toBlock =
    fromBlock + MAX_BLOCKS - 1n < confirmedHead
      ? fromBlock + MAX_BLOCKS - 1n
      : confirmedHead;

  const logs = await deps.chain.getLogs({ fromBlock, toBlock });
  const events = [...(await deps.decodeLogs(logs))].sort(orderEvents);
  const finalBlock = await deps.chain.getBlock({ blockNumber: toBlock });
  await deps.db.applyBatch({
    expectedCursor: cursor,
    fromBlock,
    toBlock,
    toBlockHash: finalBlock.hash,
    events
  });
  return { processed: events.length, fromBlock, toBlock };
}

type SupabaseLike = {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string | number): {
        eq(column: string, value: string | number): {
          maybeSingle(): Promise<{ data: unknown; error: { message: string } | null }>;
        };
      };
    };
  };
  rpc(
    name: string,
    args: Record<string, unknown>
  ): Promise<{ data: unknown; error: { message: string } | null }>;
};

export function createSyncDependencies(
  registry: Address,
  clientDb: unknown
): SyncDependencies {
  const db = clientDb as SupabaseLike;
  const client = createPublicClient({
    chain: {
      id: ARC_TESTNET.chainId,
      name: ARC_TESTNET.name,
      nativeCurrency: ARC_TESTNET.nativeCurrency,
      rpcUrls: { default: { http: [ARC_TESTNET.rpcUrl] } }
    },
    transport: http(ARC_TESTNET.rpcUrl, { timeout: 15_000, retryCount: 2 })
  });
  const normalizedRegistry = registry.toLowerCase();

  return {
    chain: {
      getBlockNumber: () => client.getBlockNumber(),
      async getBlock({ blockNumber }) {
        const block = await client.getBlock({ blockNumber });
        if (!block.hash) throw new Error("Arc returned an unsealed block.");
        return {
          number: block.number,
          hash: block.hash,
          timestamp: block.timestamp
        };
      },
      getLogs: ({ fromBlock, toBlock }) =>
        client.getLogs({
          address: registry,
          events: invoiceEvents,
          fromBlock,
          toBlock,
          strict: true
        })
    },
    db: {
      async getCursor() {
        const { data, error } = await db
          .from("chain_sync_cursor")
          .select("last_confirmed_block,last_confirmed_block_hash")
          .eq("chain_id", ARC_TESTNET.chainId)
          .eq("registry_address", normalizedRegistry)
          .maybeSingle();
        if (error) throw new SyncDatabaseError();
        if (!data) return null;
        const row = data as {
          last_confirmed_block: number | string;
          last_confirmed_block_hash: Hex;
        };
        return {
          blockNumber: BigInt(row.last_confirmed_block),
          blockHash: row.last_confirmed_block_hash
        };
      },
      async initializeCursor(input) {
        const { data, error } = await db.rpc("initialize_chain_sync_cursor", {
          p_chain_id: ARC_TESTNET.chainId,
          p_registry_address: normalizedRegistry,
          p_block_number: input.blockNumber.toString(),
          p_block_hash: input.blockHash.toLowerCase()
        });
        if (error) throw new SyncDatabaseError();
        return data === "existing" ? "existing" : "initialized";
      },
      async applyBatch(input) {
        const events = input.events.map((event) => ({
          ...event,
          blockNumber: event.blockNumber.toString(),
          invoiceId: event.invoiceId.toLowerCase(),
          merchant: event.merchant.toLowerCase(),
          txHash: event.txHash.toLowerCase(),
          blockHash: event.blockHash.toLowerCase(),
          ...("payer" in event ? { payer: event.payer.toLowerCase() } : {}),
          ...("metadataHash" in event
            ? { metadataHash: event.metadataHash.toLowerCase() }
            : {})
        }));
        const { data, error } = await db.rpc("apply_invoice_event_batch", {
          p_chain_id: ARC_TESTNET.chainId,
          p_registry_address: normalizedRegistry,
          p_expected_block: input.expectedCursor.blockNumber.toString(),
          p_expected_block_hash: input.expectedCursor.blockHash.toLowerCase(),
          p_from_block: input.fromBlock.toString(),
          p_to_block: input.toBlock.toString(),
          p_to_block_hash: input.toBlockHash.toLowerCase(),
          p_events: events
        });
        if (error) throw new SyncDatabaseError();
        return data === "idempotent" ? "idempotent" : "applied";
      }
    },
    async decodeLogs(logs) {
      const blocks = new Map<bigint, ChainBlock>();
      const events: ChainEvent[] = [];
      for (const raw of logs as Array<Record<string, unknown>>) {
        const blockNumber = raw.blockNumber as bigint;
        let block = blocks.get(blockNumber);
        if (!block) {
          const canonical = await client.getBlock({ blockNumber });
          if (!canonical.hash) throw new Error("Arc returned an unsealed block.");
          block = {
            number: canonical.number,
            hash: canonical.hash,
            timestamp: canonical.timestamp
          };
          blocks.set(blockNumber, block);
        }
        if (
          (raw.blockHash as Hex).toLowerCase() !== block.hash.toLowerCase()
        ) {
          throw new ReorgError();
        }
        const args = raw.args as Record<string, unknown>;
        const base = {
          invoiceId: (args.id as Hex).toLowerCase() as Hex,
          txHash: (raw.transactionHash as Hex).toLowerCase() as Hex,
          blockHash: block.hash.toLowerCase() as Hex,
          blockNumber,
          transactionIndex: Number(raw.transactionIndex),
          logIndex: Number(raw.logIndex),
          blockTimestamp: block.timestamp.toString()
        };
        if (raw.eventName === "InvoiceCreated") {
          events.push({
            ...base,
            eventName: "InvoiceCreated",
            merchant: getAddress(args.merchant as Address).toLowerCase() as Address,
            payer: getAddress(args.payer as Address).toLowerCase() as Address,
            amountRaw: (args.amount as bigint).toString(),
            dueChainAt: (args.dueAt as bigint).toString(),
            metadataHash: (args.metadataHash as Hex).toLowerCase() as Hex
          });
        } else if (raw.eventName === "InvoicePaid") {
          events.push({
            ...base,
            eventName: "InvoicePaid",
            merchant: getAddress(args.merchant as Address).toLowerCase() as Address,
            payer: getAddress(args.payer as Address).toLowerCase() as Address,
            amountRaw: (args.amount as bigint).toString()
          });
        } else if (raw.eventName === "InvoiceCancelled") {
          events.push({
            ...base,
            eventName: "InvoiceCancelled",
            merchant: getAddress(args.merchant as Address).toLowerCase() as Address
          });
        }
      }
      return events;
    }
  };
}
