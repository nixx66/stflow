import test from "node:test";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { walletInvoiceResponse } from "../lib/server/walletInvoiceResponse.ts";

const wallet = "0x000000000000000000000000000000000000000A";

test("rejects an invalid wallet without calling Arc", async () => {
  let called = false;
  const response = await walletInvoiceResponse("not-an-address", async () => {
    called = true;
    return [];
  });

  assert.equal(response.status, 400);
  assert.deepEqual(response.body, {
    code: "INVALID_WALLET",
    error: "A valid wallet address is required."
  });
  assert.equal(called, false);
});

test("serializes chain invoices for the browser", async () => {
  const response = await walletInvoiceResponse(wallet, async () => [{
    id: `0x${"1".repeat(64)}` as `0x${string}`,
    merchant: wallet,
    payer: "0x000000000000000000000000000000000000000b",
    amount: 125000000n,
    createdAt: 1n,
    dueAt: 2n,
    paidAt: 0n,
    metadataHash: `0x${"2".repeat(64)}` as `0x${string}`,
    status: 0
  }]);

  assert.equal(response.status, 200);
  assert.equal(response.body.invoices?.[0].amount, "125000000");
  assert.equal(response.body.invoices?.[0].dueAt, "2");
});

test("sanitizes Arc failures", async () => {
  const response = await walletInvoiceResponse(wallet, async () => {
    throw new Error("HTTP request failed https://rpc.testnet.arc.network calldata 0xdeadbeef");
  });

  assert.equal(response.status, 503);
  assert.deepEqual(response.body, {
    code: "ARC_RPC_UNAVAILABLE",
    error: "Arc Testnet data is temporarily unavailable. Please try again."
  });
  assert.doesNotMatch(JSON.stringify(response.body), /rpc\.testnet|calldata|deadbeef/i);
});

test("defers deployment configuration until a wallet request is handled", () => {
  const source = readFileSync("lib/server/readWalletInvoices.ts", "utf8");
  assert.match(source, /await import\("\.\.\/contracts\/invoiceRegistry\.ts"\)/);
  assert.doesNotMatch(source, /^import .*invoiceRegistry/m);
});
