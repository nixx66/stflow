import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ARC_CONTRACTS, ARC_TESTNET, getArcExplorerTxUrl } from "../lib/arc.ts";

test("pins payment security constants to Arc Testnet", () => {
  assert.equal(ARC_TESTNET.chainId, 5042002);
  assert.equal(ARC_TESTNET.rpcUrl, "https://rpc.testnet.arc.network");
  assert.equal(ARC_TESTNET.explorerUrl, "https://testnet.arcscan.app");
  assert.equal(
    ARC_CONTRACTS.usdc,
    "0x3600000000000000000000000000000000000000"
  );
  assert.equal(
    getArcExplorerTxUrl("0xabc"),
    "https://testnet.arcscan.app/tx/0xabc"
  );
});

test("security constants cannot be overridden by public environment variables", async () => {
  const [arc, chains, usdc, invoice, mockData, v2MockData, env] = await Promise.all([
    readFile("lib/arc.ts", "utf8"),
    readFile("lib/chains.ts", "utf8"),
    readFile("lib/usdc.ts", "utf8"),
    readFile("lib/invoice.ts", "utf8"),
    readFile("lib/mockData.ts", "utf8"),
    readFile("lib/v2MockData.ts", "utf8"),
    readFile(".env.example", "utf8")
  ]);

  for (const source of [arc, chains, usdc, invoice, mockData, v2MockData]) {
    assert.doesNotMatch(
      source,
      /NEXT_PUBLIC_ARC_CHAIN_ID|NEXT_PUBLIC_ARC_RPC_URL|NEXT_PUBLIC_ARC_EXPLORER_URL|NEXT_PUBLIC_USDC_ADDRESS/
    );
  }
  assert.doesNotMatch(
    env,
    /NEXT_PUBLIC_ARC_CHAIN_ID|NEXT_PUBLIC_ARC_RPC_URL|NEXT_PUBLIC_ARC_EXPLORER_URL|NEXT_PUBLIC_USDC_ADDRESS/
  );
});
