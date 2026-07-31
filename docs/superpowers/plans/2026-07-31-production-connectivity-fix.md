# Production Connectivity Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore production Supabase access and stop unconfigured WalletConnect clients without changing STFlow's UI or adding a paid service.

**Architecture:** Keep Supabase privileged access exclusively in Vercel server-side environment variables. Build the wagmi configuration through one exported factory that selects RainbowKit's default wallets only when a genuine WalletConnect project ID exists; otherwise it supplies only RainbowKit's injected-wallet definition so browser extensions remain available without WalletConnect network traffic.

**Tech Stack:** Next.js 15, TypeScript 5.7, wagmi 2, RainbowKit 2, Node test runner, Vercel, Supabase, Arc Testnet.

## Global Constraints

- Do not change the existing UI.
- Do not add a paid or additional hosted service.
- Never write Supabase secrets to source files, logs, fixtures, documentation, terminal output, or Git history.
- Never request private keys, seed phrases, wallet passwords, database passwords, or secret API keys through chat.
- Do not perform a wallet-signed transaction during verification.
- Preserve the production domain `https://stflow-arc.vercel.app/`.

---

### Task 1: Conditional wallet configuration

**Files:**
- Modify: `lib/wagmi.ts`
- Create: `tests/wagmiConfig.test.ts`

**Interfaces:**
- Produces: `hasWalletConnectProject(projectId: string | undefined): boolean`
- Produces: `createWagmiConfig(projectId?: string): Config`
- Preserves: `wagmiConfig` as the application-wide configuration export.

- [ ] **Step 1: Write the failing regression tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createWagmiConfig, hasWalletConnectProject } from "../lib/wagmi.ts";

test("uses injected wallets when WalletConnect is not configured", () => {
  assert.equal(hasWalletConnectProject(undefined), false);
  assert.equal(hasWalletConnectProject("walletconnect-not-configured"), false);

  const ids = createWagmiConfig(undefined).connectors.map(({ id }) => id);
  assert.ok(ids.includes("injected"));
  assert.ok(!ids.includes("walletConnect"));
});

test("enables WalletConnect for a genuine project ID", () => {
  assert.equal(hasWalletConnectProject("stflow-project-id"), true);

  const ids = createWagmiConfig("stflow-project-id").connectors.map(({ id }) => id);
  assert.ok(ids.includes("walletConnect"));
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/wagmiConfig.test.ts`

Expected: FAIL because `createWagmiConfig` and `hasWalletConnectProject` are not exported.

- [ ] **Step 3: Implement the minimal conditional configuration**

```ts
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { arcTestnet } from "./chains";

const missingProjectIds = new Set(["", "walletconnect-not-configured", "stflow-local-mock"]);

export function hasWalletConnectProject(projectId: string | undefined) {
  return Boolean(projectId && !missingProjectIds.has(projectId.trim()));
}

export function createWagmiConfig(projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  const walletConnectEnabled = hasWalletConnectProject(projectId);

  return getDefaultConfig({
    appName: "STFlow",
    projectId: walletConnectEnabled ? projectId! : "disabled",
    ...(walletConnectEnabled
      ? {}
      : {
          wallets: [
            {
              groupName: "Browser wallets",
              wallets: [injectedWallet]
            }
          ]
        }),
    chains: [arcTestnet],
    ssr: true
  });
}

export const wagmiConfig = createWagmiConfig();
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/wagmiConfig.test.ts`

Expected: 2 passing tests, 0 failures.

- [ ] **Step 5: Run project verification**

Run: `npm.cmd run typecheck`, `npm.cmd run lint`, `npm.cmd test`, and `npm.cmd run build`.

Expected: all commands exit with code 0; the full test suite has no failures.

- [ ] **Step 6: Commit the wallet fix**

```powershell
git add -- lib/wagmi.ts tests/wagmiConfig.test.ts
git commit -m "fix: disable unconfigured WalletConnect"
```

### Task 2: Secure production credential and deployment

**Files:**
- No repository files contain or receive the secret.
- Modify through Vercel dashboard: `SUPABASE_SERVICE_ROLE_KEY`.

**Interfaces:**
- Consumes: the complete Supabase `sb_secret_...` value for the `stflow_vercel` key.
- Produces: a server-only Production and Preview environment variable available to Next.js API routes.

- [ ] **Step 1: Correct the Vercel credential without exposing it**

In the Vercel `stflow` project, edit `SUPABASE_SERVICE_ROLE_KEY`, paste the complete `sb_secret_...` value directly from the Supabase API Keys page, keep **Sensitive** enabled, and select only **Production** and **Preview**.

Expected: Vercel shows the variable as Sensitive and never displays its value in deployment logs.

- [ ] **Step 2: Push the verified commit to `main`**

Run: `git push origin main`.

Expected: remote `main` advances to the wallet-fix commit.

- [ ] **Step 3: Redeploy production**

Run: `vercel --prod --yes` using the existing linked `stflow` project.

Expected: deployment succeeds and the alias remains `https://stflow-arc.vercel.app/`.

- [ ] **Step 4: Verify public pages and optional-wallet behavior**

Check `/`, `/dashboard`, `/invoice/new`, and `/console` at `https://stflow-arc.vercel.app/`.

Expected: each route returns HTTP 200; opening the wallet modal exposes an injected browser-wallet option; the browser console contains no requests using `walletconnect-not-configured`, `stflow-local-mock`, or `projectId=disabled`.

- [ ] **Step 5: Verify Supabase-backed APIs**

Request a nonexistent valid-format invoice ID through `GET /api/v1/invoices/{id}` and submit a syntactically valid nonce request through `POST /api/v1/invoices/nonce`.

Expected: the invoice lookup returns 404 rather than 503; the nonce endpoint returns a successful nonce response rather than `Metadata service unavailable`; responses contain no secret values.

- [ ] **Step 6: Verify Arc and sync protection**

Check Arc RPC chain ID `5042002`, verify bytecode remains present at `0x5dBcc64dDd280df36759E80e1C265539cc4AE428`, and call `/api/internal/sync-chain` without authorization.

Expected: Arc RPC responds, contract bytecode is nonempty, and unauthorized sync returns HTTP 401.

- [ ] **Step 7: Record the deployment result**

Run: `git status --short`.

Expected: no uncommitted source or secret files; report the stable URL, deployment identifier, verification commands, and any remaining wallet-signed test gap.
