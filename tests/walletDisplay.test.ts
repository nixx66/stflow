import test from "node:test";
import assert from "node:assert/strict";
import {
  getMerchantWalletDisplay,
  getWalletConnectionLabel,
  getWalletNetworkLabel,
  shortenWalletAddress
} from "../lib/walletDisplay.ts";

test("shortens wallet addresses for compact UI surfaces", () => {
  assert.equal(
    shortenWalletAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e"),
    "0x742d...f44e"
  );
});

test("returns safe labels for wallet connection states", () => {
  assert.equal(getWalletConnectionLabel(undefined), "Wallet not connected");
  assert.equal(
    getWalletConnectionLabel("0x742d35Cc6634C0532925a3b844Bc454e4438f44e"),
    "0x742d...f44e"
  );
});

test("describes network readiness for mock-first payment flow", () => {
  assert.equal(getWalletNetworkLabel(5042002, 5042002), "Testnet ready");
  assert.equal(getWalletNetworkLabel(1, 5042002), "Switch to Testnet");
  assert.equal(getWalletNetworkLabel(undefined, 5042002), "Network not connected");
});

test("does not present demo merchant wallet as connected in live mode", () => {
  assert.deepEqual(getMerchantWalletDisplay({ livePayment: true }), {
    badge: "Connect wallet required",
    detail: "No merchant wallet connected",
    isConnected: false
  });
});

test("shows the connected merchant wallet only after wallet connection", () => {
  assert.deepEqual(
    getMerchantWalletDisplay({
      livePayment: true,
      connectedWallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    }),
    {
      badge: "Connected wallet",
      detail: "0x742d...f44e",
      isConnected: true
    }
  );
});
