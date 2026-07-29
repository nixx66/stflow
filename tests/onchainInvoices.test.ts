import assert from "node:assert/strict";
import test from "node:test";
import {
  fetchWalletInvoices,
  mapChainInvoice,
  walletInvoiceIds
} from "../lib/onchainInvoices.ts";
import { hashInvoiceMetadata } from "../lib/invoiceMetadata.ts";
import type { Hex } from "viem";

const wallet = "0x0000000000000000000000000000000000000001";
const id = `0x${"1".repeat(64)}` as Hex;
const metadata = {
  customerName: "Payer",
  title: "Consulting",
  description: "July services",
  memo: "PO-7"
};

test("wallet invoice ids are read in pages capped at 100", async () => {
  const calls: Array<[number, number]> = [];
  const ids = await walletInvoiceIds(wallet, {
    count: async () => 205n,
    page: async (_wallet, offset, limit) => {
      calls.push([Number(offset), Number(limit)]);
      return Array.from({ length: Math.min(Number(limit), 205 - Number(offset)) }, (_, i) => {
        return `0x${(Number(offset) + i + 1).toString(16).padStart(64, "0")}` as Hex;
      });
    }
  });

  assert.equal(ids.length, 205);
  assert.deepEqual(calls, [[0, 100], [100, 100], [200, 5]]);
});

test("chain status is authoritative and pending expiry is derived", () => {
  const invoice = mapChainInvoice(
    {
      id,
      merchant: wallet,
      payer: "0x0000000000000000000000000000000000000002",
      amount: 12_500_000n,
      createdAt: 100n,
      dueAt: 200n,
      paidAt: 0n,
      metadataHash: hashInvoiceMetadata(metadata),
      status: 0
    },
    metadata,
    201n
  );

  assert.equal(invoice.status, "expired");
  assert.equal(invoice.amount, "12.5");
  assert.equal(invoice.title, "Consulting");
});

test("metadata hash mismatch fails closed", async () => {
  await assert.rejects(
    fetchWalletInvoices(wallet, {
      count: async () => 1n,
      page: async () => [id],
      invoice: async () => ({
        id,
        merchant: wallet,
        payer: "0x0000000000000000000000000000000000000002",
        amount: 1n,
        createdAt: 100n,
        dueAt: 200n,
        paidAt: 0n,
        metadataHash: `0x${"2".repeat(64)}` as Hex,
        status: 0
      }),
      metadata: async () => metadata
    }),
    /metadata.*hash/i
  );
});

test("wallet invoice reads use bounded concurrency and preserve registry order", async () => {
  let active = 0;
  let maxActive = 0;
  const ids = Array.from({ length: 12 }, (_, i) => {
    return `0x${(i + 1).toString(16).padStart(64, "0")}` as Hex;
  });
  const invoices = await fetchWalletInvoices(wallet, {
    count: async () => 12n,
    page: async () => ids,
    invoice: async (invoiceId) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 2));
      active--;
      return {
        id: invoiceId,
        merchant: wallet,
        payer: "0x0000000000000000000000000000000000000002",
        amount: 1_000_000n,
        createdAt: 100n,
        dueAt: 200n,
        paidAt: 0n,
        metadataHash: hashInvoiceMetadata(metadata),
        status: 0
      };
    },
    metadata: async () => metadata
  });

  assert.ok(maxActive <= 5);
  assert.deepEqual(invoices.map((invoice) => invoice.id), ids);
});
