import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  getNetworkSwitchError,
  switchToArcTestnet
} from "../lib/walletNetwork.ts";

test("requests Arc Network Testnet directly", async () => {
  const requested: number[] = [];

  await switchToArcTestnet(async (chainId) => {
    requested.push(chainId);
  });

  assert.deepEqual(requested, [5042002]);
});

test("normalizes rejected and failed switch requests", () => {
  assert.equal(
    getNetworkSwitchError({ code: 4001 }),
    "Network switch was cancelled in your wallet."
  );
  assert.equal(
    getNetworkSwitchError(new Error("provider failed")),
    "Unable to switch to Arc Testnet. Check MetaMask and try again."
  );
});

test("unsupported network control uses the direct switch path", () => {
  const control = readFileSync("components/wallet/WalletConnectControl.tsx", "utf8");
  const networkSwitch = readFileSync("components/wallet/WalletNetworkSwitch.tsx", "utf8");

  assert.match(control, /WalletNetworkSwitch/);
  assert.doesNotMatch(control, /openChainModal/);
  assert.match(networkSwitch, /switchToArcTestnet/);
  assert.match(networkSwitch, /aria-live="assertive"/);
});
