import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ReorgError,
  SyncConfigError,
  authorizeCron,
  parseSyncConfig,
  projectMetadataStatus,
  syncInvoiceEvents,
  type ChainEvent,
  type SyncDependencies
} from "../lib/server/syncInvoiceEvents.ts";

const registry = "0x1111111111111111111111111111111111111111";
const hash = (digit: string) => `0x${digit.repeat(64)}` as `0x${string}`;
const address = (digit: string) => `0x${digit.repeat(40)}` as `0x${string}`;

const created: ChainEvent = {
  eventName: "InvoiceCreated",
  invoiceId: hash("1"),
  merchant: address("2"),
  payer: address("3"),
  amountRaw: "1000000",
  dueChainAt: "2000",
  metadataHash: hash("4"),
  txHash: hash("5"),
  blockHash: hash("6"),
  blockNumber: 101n,
  transactionIndex: 2,
  logIndex: 4,
  blockTimestamp: "1000"
};

function harness(overrides: Partial<SyncDependencies> = {}) {
  const calls = {
    logs: [] as Array<{ fromBlock: bigint; toBlock: bigint }>,
    apply: [] as unknown[],
    init: [] as unknown[]
  };
  const deps: SyncDependencies = {
    chain: {
      getBlockNumber: async () => 150n,
      getBlock: async ({ blockNumber }) => ({
        number: blockNumber,
        hash: blockNumber === 99n ? hash("9") : hash("6"),
        timestamp: 1000n
      }),
      getLogs: async ({ fromBlock, toBlock }) => {
        calls.logs.push({ fromBlock, toBlock });
        return [];
      }
    },
    db: {
      getCursor: async () => ({
        blockNumber: 100n,
        blockHash: hash("6")
      }),
      initializeCursor: async (input) => {
        calls.init.push(input);
        return "initialized";
      },
      applyBatch: async (input) => {
        calls.apply.push(input);
        return "applied";
      }
    },
    decodeLogs: async () => [],
    ...overrides
  };
  return { deps, calls };
}

test("rejects malformed deployment, confirmation, and cron configuration", () => {
  const base = {
    INVOICE_REGISTRY_DEPLOYMENT_BLOCK: "100",
    ARC_CONFIRMATION_DEPTH: "12",
    CRON_SECRET: "0123456789abcdef0123456789abcdef"
  };
  assert.deepEqual(parseSyncConfig(base), {
    deploymentBlock: 100n,
    confirmationDepth: 12n,
    cronSecret: base.CRON_SECRET
  });
  for (const env of [
    { ...base, INVOICE_REGISTRY_DEPLOYMENT_BLOCK: "-1" },
    { ...base, INVOICE_REGISTRY_DEPLOYMENT_BLOCK: "1.5" },
    { ...base, INVOICE_REGISTRY_DEPLOYMENT_BLOCK: "9007199254740992" },
    { ...base, ARC_CONFIRMATION_DEPTH: "0" },
    { ...base, ARC_CONFIRMATION_DEPTH: "1001" },
    { ...base, CRON_SECRET: "short-secret" }
  ]) {
    assert.throws(() => parseSyncConfig(env), SyncConfigError);
  }
});

test("uses constant-time cron authorization without accepting malformed headers", () => {
  const secret = "0123456789abcdef0123456789abcdef";
  assert.equal(authorizeCron(`Bearer ${secret}`, secret), true);
  for (const header of [
    null,
    "",
    secret,
    `bearer ${secret}`,
    `Bearer ${secret}x`,
    "Bearer"
  ]) {
    assert.equal(authorizeCron(header, secret), false);
  }
});

test("holds back unconfirmed blocks and caps each scan at 2000 blocks", async () => {
  const { deps, calls } = harness({
    chain: {
      getBlockNumber: async () => 9999n,
      getBlock: async ({ blockNumber }) => ({
        number: blockNumber,
        hash: blockNumber === 100n ? hash("6") : hash("7"),
        timestamp: 1000n
      }),
      getLogs: async ({ fromBlock, toBlock }) => {
        calls.logs.push({ fromBlock, toBlock });
        return [];
      }
    }
  });
  const result = await syncInvoiceEvents(
    { deploymentBlock: 100n, confirmationDepth: 12n },
    deps
  );
  assert.deepEqual(calls.logs, [{ fromBlock: 101n, toBlock: 2100n }]);
  assert.equal(result.toBlock, 2100n);
});

test("does not scan when confirmations leave no new block", async () => {
  const { deps, calls } = harness({
    chain: {
      getBlockNumber: async () => 105n,
      getBlock: async ({ blockNumber }) => ({
        number: blockNumber,
        hash: hash("6"),
        timestamp: 1000n
      }),
      getLogs: async () => {
        throw new Error("must not scan");
      }
    }
  });
  const result = await syncInvoiceEvents(
    { deploymentBlock: 100n, confirmationDepth: 5n },
    deps
  );
  assert.equal(result.processed, 0);
  assert.equal(calls.apply.length, 0);
});

test("fails closed on cursor hash mismatch before requesting logs", async () => {
  let requestedLogs = false;
  const { deps } = harness({
    chain: {
      getBlockNumber: async () => 150n,
      getBlock: async ({ blockNumber }) => ({
        number: blockNumber,
        hash: hash("8"),
        timestamp: 1000n
      }),
      getLogs: async () => {
        requestedLogs = true;
        return [];
      }
    }
  });
  await assert.rejects(
    syncInvoiceEvents(
      { deploymentBlock: 100n, confirmationDepth: 12n },
      deps
    ),
    ReorgError
  );
  assert.equal(requestedLogs, false);
});

test("initializes at deployment minus one using the canonical block hash", async () => {
  const { deps, calls } = harness({
    db: {
      getCursor: async () => null,
      initializeCursor: async (input) => {
        calls.init.push(input);
        return "initialized";
      },
      applyBatch: async () => "applied"
    }
  });
  await syncInvoiceEvents(
    { deploymentBlock: 100n, confirmationDepth: 12n },
    deps
  );
  assert.deepEqual(calls.init, [
    { blockNumber: 99n, blockHash: hash("9") }
  ]);
});

test("sorts same-block events by transaction and log index and applies once", async () => {
  const later = { ...created, transactionIndex: 4, logIndex: 1, txHash: hash("7") };
  const earlier = { ...created, transactionIndex: 2, logIndex: 9, txHash: hash("8") };
  const { deps, calls } = harness({
    decodeLogs: async () => [later, earlier]
  });
  await syncInvoiceEvents(
    { deploymentBlock: 100n, confirmationDepth: 12n },
    deps
  );
  const batch = calls.apply[0] as { events: ChainEvent[] };
  assert.deepEqual(batch.events.map((event) => event.txHash), [
    earlier.txHash,
    later.txHash
  ]);
  assert.equal(calls.apply.length, 1);
});

test("RPC failure never calls the database batch", async () => {
  const { deps, calls } = harness({
    chain: {
      getBlockNumber: async () => 150n,
      getBlock: async ({ blockNumber }) => ({
        number: blockNumber,
        hash: hash("6"),
        timestamp: 1000n
      }),
      getLogs: async () => {
        throw new Error("rpc unavailable");
      }
    }
  });
  await assert.rejects(
    syncInvoiceEvents(
      { deploymentBlock: 100n, confirmationDepth: 12n },
      deps
    ),
    /rpc unavailable/
  );
  assert.equal(calls.apply.length, 0);
});

test("database failure is surfaced and no local cursor exists to advance", async () => {
  const { deps, calls } = harness({
    db: {
      getCursor: async () => ({ blockNumber: 100n, blockHash: hash("6") }),
      initializeCursor: async () => "initialized",
      applyBatch: async (input) => {
        calls.apply.push(input);
        throw new Error("database unavailable");
      }
    }
  });
  await assert.rejects(
    syncInvoiceEvents(
      { deploymentBlock: 100n, confirmationDepth: 12n },
      deps
    ),
    /database unavailable/
  );
  assert.equal(calls.apply.length, 1);
});

test("later metadata projects an already processed terminal event", () => {
  const paid = {
    eventName: "InvoicePaid" as const,
    invoiceId: created.invoiceId,
    merchant: created.merchant,
    payer: created.payer,
    amountRaw: created.amountRaw,
    txHash: hash("a"),
    blockHash: hash("b"),
    blockNumber: 110n,
    transactionIndex: 0,
    logIndex: 2,
    blockTimestamp: "1500"
  };
  assert.deepEqual(projectMetadataStatus(created, paid), {
    indexedStatus: "paid",
    paidChainAt: "1500",
    paymentTxHash: paid.txHash,
    paymentBlockNumber: 110n,
    paymentLogIndex: 2
  });
  assert.throws(
    () => projectMetadataStatus(created, { ...paid, amountRaw: "2" }),
    /conflict/i
  );
});

test("migration installs an atomic service-only event projection", async () => {
  const sql = await readFile(
    "supabase/migrations/202607290003_chain_sync_rpc.sql",
    "utf8"
  );
  assert.match(sql, /block_timestamp numeric\(20,\s*0\)/i);
  assert.match(sql, /create function public\.apply_invoice_event_batch/i);
  assert.match(sql, /create function public\.initialize_chain_sync_cursor/i);
  assert.match(sql, /security definer[\s\S]*set search_path = ''/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /jsonb_array_elements[\s\S]*with ordinality/i);
  assert.match(sql, /STFLOW_SYNC_RANGE/i);
  assert.match(sql, /STFLOW_SYNC_CURSOR/i);
  assert.match(sql, /STFLOW_EVENT_CONFLICT/i);
  assert.match(sql, /on conflict \(chain_id, registry_address, tx_hash, log_index\)/i);
  assert.match(sql, /create or replace function public\.persist_invoice_metadata/i);
  assert.match(sql, /processed_chain_events[\s\S]*InvoicePaid/i);
  assert.match(sql, /processed_chain_events[\s\S]*InvoiceCancelled/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
  assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated/i);
});

test("cron route is private, node-only, and scheduled every minute", async () => {
  const [route, vercel] = await Promise.all([
    readFile("app/api/internal/sync-chain/route.ts", "utf8"),
    readFile("vercel.json", "utf8")
  ]);
  assert.match(route, /export const runtime = "nodejs"/);
  assert.match(route, /authorizeCron/);
  assert.match(route, /status:\s*401/);
  assert.match(route, /status:\s*503/);
  assert.match(route, /status:\s*409/);
  assert.doesNotMatch(route, /console\.(log|error).*secret/i);
  assert.deepEqual(JSON.parse(vercel), {
    crons: [{ path: "/api/internal/sync-chain", schedule: "* * * * *" }]
  });
});
