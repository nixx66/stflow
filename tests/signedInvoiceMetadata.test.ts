import assert from "node:assert/strict";
import test from "node:test";
import {
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  keccak256,
  toHex,
  type Hex
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { invoiceCreatedEvent } from "../lib/invoiceCreateTransaction.ts";
import { hashInvoiceMetadata, invoiceIdFromReference } from "../lib/invoiceMetadata.ts";
import { buildWalletChallenge, hashNonce } from "../lib/server/internal/walletAuth.ts";
import {
  getInvoiceMetadata,
  persistSignedInvoiceMetadata,
  type MetadataRepository
} from "../lib/server/internal/signedInvoiceMetadata.ts";
type PersistDeps = Parameters<typeof persistSignedInvoiceMetadata>[1];

const merchant = privateKeyToAccount(`0x${"33".repeat(32)}`);
const payer = privateKeyToAccount(`0x${"44".repeat(32)}`).address;
const registry = getAddress("0x1111111111111111111111111111111111111111");
const referenceId = `0x${"55".repeat(32)}` as Hex;
const invoiceId = invoiceIdFromReference(merchant.address, referenceId);
const txHash = `0x${"66".repeat(32)}` as Hex;
const metadata = {
  customerName: " Alice ",
  title: " Arc services ",
  description: " Settlement ",
  memo: " July "
};
const metadataHash = hashInvoiceMetadata(metadata);
const nonce = "0123456789abcdef".repeat(2);
const issuedAt = new Date("2026-07-29T00:00:00.000Z");
const expiresAt = new Date(issuedAt.getTime() + 5 * 60_000);

function createdLog(address = registry, hash = metadataHash) {
  return {
    address,
    logIndex: 7,
    topics: encodeEventTopics({
      abi: [invoiceCreatedEvent],
      eventName: "InvoiceCreated",
      args: { id: invoiceId, merchant: merchant.address, payer }
    }),
    data: encodeAbiParameters(
      [{ type: "uint128" }, { type: "uint64" }, { type: "bytes32" }],
      [BigInt(12_500_000), BigInt(1_800_000_000), hash]
    )
  };
}

function repo(): MetadataRepository & { rows: Map<string, Record<string, unknown>> } {
  const rows = new Map<string, Record<string, unknown>>();
  let consumed = false;
  return {
    rows,
    async consumeNonce(input) {
      if (
        consumed ||
        input.nonceHash !== hashNonce(nonce) ||
        input.wallet !== merchant.address.toLowerCase()
      ) return false;
      consumed = true;
      return true;
    },
    async find(identity) {
      return rows.get(identity.invoiceId) ?? null;
    },
    async insert(row) {
      if (rows.has(row.invoice_id as string)) return "conflict";
      rows.set(row.invoice_id as string, row);
      return "inserted";
    }
  };
}

async function request(overrides: Record<string, unknown> = {}) {
  const payloadBinding = keccak256(toHex(JSON.stringify({
    txHash,
    referenceId,
    metadata: {
      customerName: "Alice",
      title: "Arc services",
      description: "Settlement",
      memo: "July"
    }
  })));
  const challenge = buildWalletChallenge({
    wallet: merchant.address,
    action: "create_invoice",
    registry,
    payloadBinding,
    nonce,
    issuedAt,
    expiresAt
  });
  return {
    txHash,
    referenceId,
    metadata,
    challenge,
    signature: await merchant.signMessage({ message: challenge }),
    ...overrides
  };
}

function deps(
  repository = repo(),
  logs = [createdLog()]
): PersistDeps {
  return {
    repository,
    config: {
      chainId: 5042002,
      registry,
      rpcUrl: "https://rpc.testnet.arc.network"
    },
    rpc: {
      async getReceipt() {
        return {
          status: "success" as const,
          blockNumber: BigInt(99),
          logs: logs.map((log) => ({
            ...log,
            topics: log.topics.filter((topic): topic is Hex => typeof topic === "string")
          }))
        };
      },
      async getBlock() {
        return { timestamp: BigInt(1_700_000_000) };
      }
    },
    now: () => new Date("2026-07-29T00:01:00.000Z")
  };
}

test("persists only chain-derived identity and canonical metadata", async () => {
  const repository = repo();
  const result = await persistSignedInvoiceMetadata(await request(), deps(repository));
  assert.equal(result.invoiceId, invoiceId.toLowerCase());
  const row = repository.rows.get(invoiceId.toLowerCase())!;
  assert.equal(row.merchant_wallet, merchant.address.toLowerCase());
  assert.equal(row.amount_raw, "12500000");
  assert.equal(row.created_chain_at, "1700000000");
  assert.equal(row.title, "Arc services");
});

test("rejects wrong registry, multiple events, reverted receipts, and hash mismatch", async () => {
  const wrong = getAddress("0x2222222222222222222222222222222222222222");
  await assert.rejects(
    persistSignedInvoiceMetadata(await request(), deps(repo(), [createdLog(wrong)])),
    /exactly one/i
  );
  await assert.rejects(
    persistSignedInvoiceMetadata(await request(), deps(repo(), [createdLog(), createdLog()])),
    /exactly one/i
  );
  const reverted = deps();
  reverted.rpc.getReceipt = async () => ({
    status: "reverted",
    blockNumber: BigInt(99),
    logs: []
  });
  await assert.rejects(persistSignedInvoiceMetadata(await request(), reverted), /reverted/i);
  await assert.rejects(
    persistSignedInvoiceMetadata(
      await request(),
      deps(repo(), [createdLog(registry, `0x${"77".repeat(32)}`)])
    ),
    /metadata hash/i
  );
});

test("rejects replayed and concurrently reused nonces", async () => {
  const repository = repo();
  const input = await request();
  const [a, b] = await Promise.allSettled([
    persistSignedInvoiceMetadata(input, deps(repository)),
    persistSignedInvoiceMetadata(input, deps(repository))
  ]);
  assert.equal([a, b].filter((item) => item.status === "fulfilled").length, 1);
  assert.equal([a, b].filter((item) => item.status === "rejected").length, 1);
});

test("is idempotent for an identical saved request and rejects different metadata", async () => {
  const repository = repo();
  const input = await request();
  await persistSignedInvoiceMetadata(input, deps(repository));
  assert.equal((await persistSignedInvoiceMetadata(input, deps(repository))).idempotent, true);

  await assert.rejects(
    persistSignedInvoiceMetadata(
      await request({ metadata: { ...metadata, memo: "changed" } }),
      deps(repository)
    ),
    /conflict|binding|hash/i
  );
});

test("public read returns minimal metadata and no database status authority", async () => {
  const repository = repo();
  await persistSignedInvoiceMetadata(await request(), deps(repository));
  const result = await getInvoiceMetadata(invoiceId, {
    repository,
    config: { chainId: 5042002, registry }
  });
  assert.deepEqual(Object.keys(result!).sort(), [
    "customerName",
    "description",
    "invoiceId",
    "memo",
    "metadataHash",
    "title"
  ]);
  assert.equal("indexedStatus" in result!, false);
});

test("rejects malformed request shapes as validation errors", async () => {
  await assert.rejects(
    persistSignedInvoiceMetadata(null as never, deps()),
    /invalid metadata request/i
  );
  await assert.rejects(
    persistSignedInvoiceMetadata({ ...(await request()), metadata: null } as never, deps()),
    /invalid invoice metadata/i
  );
});
