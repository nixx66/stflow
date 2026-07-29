import assert from "node:assert/strict";
import test from "node:test";
import { getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { issueInvoiceNonce } from "../lib/server/internal/invoiceNonce.ts";
import { hashNonce } from "../lib/server/internal/walletAuth.ts";

const wallet = privateKeyToAccount(`0x${"12".repeat(32)}`).address;
const registry = getAddress("0x1111111111111111111111111111111111111111");

test("stores only the nonce hash and returns a bounded signed challenge", async () => {
  let saved: Record<string, string> | undefined;
  const result = await issueInvoiceNonce(
    {
      wallet,
      action: "create_invoice",
      txHash: `0x${"33".repeat(32)}`,
      referenceId: `0x${"44".repeat(32)}`,
      metadata: { customerName: "", title: "Invoice", description: "", memo: "" }
    },
    {
      registry,
      now: () => new Date("2026-07-29T00:00:00.000Z"),
      randomNonce: () => "abcdef0123456789".repeat(2),
      save: async (row) => { saved = row; }
    }
  );

  assert.equal(saved?.nonce_hash, hashNonce("abcdef0123456789".repeat(2)));
  assert.equal(JSON.stringify(saved).includes("abcdef0123456789"), false);
  assert.match(result.challenge, /Chain ID: 5042002/);
  assert.match(result.challenge, /Action: create_invoice/);
  assert.equal(
    new Date(result.expiresAt).getTime() - new Date(result.issuedAt).getTime(),
    5 * 60_000
  );
});

test("rejects unsupported actions and malformed wallet input", async () => {
  const deps = {
    registry,
    save: async () => {},
    randomNonce: () => "abcdef0123456789".repeat(2)
  };
  await assert.rejects(
    issueInvoiceNonce({
      wallet,
      action: "list_invoices" as "create_invoice",
      txHash: `0x${"33".repeat(32)}`,
      referenceId: `0x${"44".repeat(32)}`,
      metadata: { customerName: "", title: "Invoice", description: "", memo: "" }
    }, deps),
    /action/i
  );
  await assert.rejects(
    issueInvoiceNonce({
      wallet: "bad" as typeof wallet,
      action: "create_invoice",
      txHash: `0x${"33".repeat(32)}`,
      referenceId: `0x${"44".repeat(32)}`,
      metadata: { customerName: "", title: "Invoice", description: "", memo: "" }
    }, deps),
    /wallet/i
  );
});
