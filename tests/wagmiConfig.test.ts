import assert from "node:assert/strict";
import test from "node:test";
import { createWagmiConfig, hasWalletConnectProject } from "../lib/wagmi.ts";

test("uses injected wallets when WalletConnect is not configured", () => {
  assert.equal(hasWalletConnectProject(undefined), false);
  assert.equal(hasWalletConnectProject("walletconnect-not-configured"), false);
  assert.equal(hasWalletConnectProject("stflow-local-mock"), false);

  const ids = createWagmiConfig(undefined).connectors.map(({ id }) => id);
  assert.ok(ids.includes("injected"));
  assert.ok(!ids.includes("walletConnect"));
});

test("enables WalletConnect for a genuine project ID", () => {
  const projectId = "1234567890abcdef1234567890abcdef";
  assert.equal(hasWalletConnectProject(projectId), true);

  const connectors = createWagmiConfig(projectId).connectors;
  assert.ok(connectors.length > 1);
});
