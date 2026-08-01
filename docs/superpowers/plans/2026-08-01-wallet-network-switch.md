# Wallet Network Switch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Switch to Testnet` directly request Arc Network Testnet from MetaMask instead of depending on a RainbowKit modal.

**Architecture:** Add a focused wallet-network helper that performs the Wagmi switch request and normalizes errors. Update the existing wallet control to call it, track pending state, and render an inline accessible error while retaining the current button styling.

**Tech Stack:** TypeScript, React 19, Wagmi 2, RainbowKit 2, Node test runner

## Global Constraints

- Arc Network Testnet chain ID is exactly `5042002`.
- Keep the existing navigation layout and button styling.
- Do not change invoice, payment, Supabase, or contract behaviour.
- Do not read private keys, seed phrases, or sign transactions automatically.

---

### Task 1: Direct Arc network switch

**Files:**
- Create: `lib/walletNetwork.ts`
- Modify: `components/wallet/WalletConnectControl.tsx`
- Test: `tests/walletNetworkSwitch.test.ts`

**Interfaces:**
- Consumes: Wagmi `switchChain(config, { chainId })` through an injected switch function.
- Produces: `switchToArcTestnet(switchChain: (chainId: number) => Promise<unknown>): Promise<void>` and `getNetworkSwitchError(error: unknown): string`.

- [x] **Step 1: Write the failing regression tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  getNetworkSwitchError,
  switchToArcTestnet
} from "../lib/walletNetwork.ts";

test("requests Arc Network Testnet directly", async () => {
  const requested: number[] = [];
  await switchToArcTestnet(async (chainId) => requested.push(chainId));
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
```

- [x] **Step 2: Run the test and verify RED**

Run: `node --test tests/walletNetworkSwitch.test.ts`

Expected: FAIL because `lib/walletNetwork.ts` does not exist.

- [x] **Step 3: Implement the minimal helper**

```ts
import { ARC_TESTNET } from "./arc.ts";

type SwitchChain = (chainId: number) => Promise<unknown>;

export async function switchToArcTestnet(switchChain: SwitchChain) {
  await switchChain(ARC_TESTNET.chainId);
}

export function getNetworkSwitchError(error: unknown) {
  if (typeof error === "object" && error !== null && "code" in error && error.code === 4001) {
    return "Network switch was cancelled in your wallet.";
  }
  return "Unable to switch to Arc Testnet. Check MetaMask and try again.";
}
```

- [x] **Step 4: Verify the helper test passes**

Run: `node --test tests/walletNetworkSwitch.test.ts`

Expected: 2 tests pass, 0 fail.

- [x] **Step 5: Connect the button to Wagmi**

Use `useConfig`, local pending/error state, and Wagmi's `switchChain` action. The unsupported-chain button must call:

```ts
await switchToArcTestnet((chainId) => switchChain(config, { chainId }));
```

It must disable itself while pending, preserve its existing classes, and render the normalized error in an `aria-live="assertive"` status element.

- [x] **Step 6: Run focused and full verification**

Run:

```text
node --test tests/walletNetworkSwitch.test.ts tests/walletAccountMenu.test.ts tests/walletDisplay.test.ts
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run build
```

Expected: every command exits `0`; all tests pass with no failures.

- [ ] **Step 7: Commit, push, deploy, and manually verify**

Commit message: `fix: switch directly to Arc testnet`

After Vercel reports Ready, open `https://stflow-arc.vercel.app/`, connect MetaMask on a different chain, click `Switch to Testnet`, approve the MetaMask request, and confirm the control changes to the connected address. Then resume accounts 1–4 hot-switch acceptance testing.
