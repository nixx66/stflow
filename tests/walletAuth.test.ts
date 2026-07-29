import assert from "node:assert/strict";
import test from "node:test";
import { privateKeyToAccount } from "viem/accounts";
import {
  buildWalletChallenge,
  hashNonce,
  verifyWalletAuthorization
} from "../lib/server/internal/walletAuth.ts";

const account = privateKeyToAccount(`0x${"11".repeat(32)}`);
const other = privateKeyToAccount(`0x${"22".repeat(32)}`);
const registry = "0x1111111111111111111111111111111111111111";
const now = new Date("2026-07-29T00:00:00.000Z");

function challenge() {
  return buildWalletChallenge({
    wallet: account.address,
    action: "create_invoice",
    registry,
    payloadBinding: `0x${"ab".repeat(32)}`,
    nonce: "0123456789abcdef".repeat(2),
    issuedAt: now,
    expiresAt: new Date(now.getTime() + 5 * 60_000)
  });
}

test("verifies the merchant signature over the exact challenge", async () => {
  const message = challenge();
  const signature = await account.signMessage({ message });

  const parsed = await verifyWalletAuthorization({
    message,
    signature,
    expectedWallet: account.address,
    expectedAction: "create_invoice",
    expectedRegistry: registry,
    expectedPayloadBinding: `0x${"ab".repeat(32)}`,
    now
  });

  assert.equal(parsed.wallet, account.address.toLowerCase());
});

test("rejects a signature from another wallet", async () => {
  const message = challenge();
  const signature = await other.signMessage({ message });
  await assert.rejects(
    verifyWalletAuthorization({
      message,
      signature,
      expectedWallet: account.address,
      expectedAction: "create_invoice",
      expectedRegistry: registry,
      expectedPayloadBinding: `0x${"ab".repeat(32)}`,
      now
    }),
    /signature/i
  );
});

test("rejects expired and tampered challenges", async () => {
  const message = challenge();
  const signature = await account.signMessage({ message });

  await assert.rejects(
    verifyWalletAuthorization({
      message,
      signature,
      expectedWallet: account.address,
      expectedAction: "create_invoice",
      expectedRegistry: registry,
      expectedPayloadBinding: `0x${"ab".repeat(32)}`,
      now: new Date(now.getTime() + 10 * 60_000)
    }),
    /expired/i
  );
  await assert.rejects(
    verifyWalletAuthorization({
      message: message.replace("create_invoice", "list_invoices"),
      signature,
      expectedWallet: account.address,
      expectedAction: "create_invoice",
      expectedRegistry: registry,
      expectedPayloadBinding: `0x${"ab".repeat(32)}`,
      now
    }),
    /challenge|signature/i
  );
});

test("hashes nonce values without retaining the original nonce", () => {
  assert.match(hashNonce("sensitive-nonce"), /^[0-9a-f]{64}$/);
  assert.equal(hashNonce("sensitive-nonce"), hashNonce("sensitive-nonce"));
});
