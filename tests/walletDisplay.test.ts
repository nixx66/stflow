import test from "node:test";
import assert from "node:assert/strict";
import {
  copyWalletAddress,
  copyWalletAddressIfCurrent,
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

test("requires a connected merchant wallet", () => {
  assert.deepEqual(getMerchantWalletDisplay({}), {
    badge: "Connect wallet required",
    detail: "No merchant wallet connected",
    isConnected: false
  });
});

test("shows the connected merchant wallet only after wallet connection", () => {
  assert.deepEqual(
    getMerchantWalletDisplay({
      connectedWallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e"
    }),
    {
      badge: "Connected wallet",
      detail: "0x742d...f44e",
      isConnected: true
    }
  );
});

test("copies the connected wallet address", async () => {
  const writes: string[] = [];
  const copied = await copyWalletAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e", async (value) => {
    writes.push(value);
  });

  assert.equal(copied, true);
  assert.deepEqual(writes, ["0x742d35Cc6634C0532925a3b844Bc454e4438f44e"]);
});

test("reports clipboard failures without swallowing the wallet flow", async () => {
  const copied = await copyWalletAddress("0x742d35Cc6634C0532925a3b844Bc454e4438f44e", async () => {
    throw new Error("Clipboard unavailable");
  });

  assert.equal(copied, false);
});

test("ignores a clipboard result invalidated while the write is pending", async () => {
  let resolveWrite!: () => void;
  let generation = 1;
  let feedback = 0;
  const write = new Promise<void>((resolve) => {
    resolveWrite = resolve;
  });

  const pending = copyWalletAddressIfCurrent(
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    () => write,
    () => generation === 1,
    () => {
      feedback += 1;
    }
  );

  generation += 1;
  resolveWrite();

  assert.equal(await pending, false);
  assert.equal(feedback, 0);
});

test("allows a new clipboard attempt after an earlier attempt is invalidated", async () => {
  let generation = 2;
  let feedback = 0;

  const copied = await copyWalletAddressIfCurrent(
    "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    async () => {},
    () => generation === 2,
    () => {
      feedback += 1;
    }
  );

  assert.equal(copied, true);
  assert.equal(feedback, 1);
});
