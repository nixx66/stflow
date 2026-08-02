# Arc Custom RPC Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route every server-side Arc Testnet read through a private Alchemy endpoint with Circle's public RPC as a bounded fallback, without exposing credentials or changing wallet/UI behavior.

**Architecture:** Extend the existing server runtime configuration with an optional `ARC_RPC_URL`, then centralize viem client creation in one server-only module. The transport uses Alchemy first and Circle second, while browser wallet configuration remains unchanged and continues to use the public Arc endpoint.

**Tech Stack:** Next.js 15, TypeScript 5.7, viem 2.x, Node test runner, Vercel environment variables.

## Global Constraints

- `ARC_RPC_URL` is server-only and must never use a `NEXT_PUBLIC_` prefix.
- Never commit or log an Alchemy API key, wallet private key, or seed phrase.
- Keep Arc Testnet chain ID `5042002`, registry address, USDC address, contract ABI, database schema, UI, and wallet transaction flow unchanged.
- Private and fallback RPC calls use finite timeouts/retries; contract reverts and invalid calls are not retried as transport failures.
- Circle's `https://rpc.testnet.arc.network` remains the browser network URL and server fallback.
- Store this plan outside `docs/superpowers`, which is intentionally excluded from this repository.

---

## File Map

- Modify `lib/server/internal/runtimeConfig.ts`: validate and expose the optional private RPC endpoint as an ordered server RPC URL list.
- Create `lib/server/arcRpc.ts`: own the shared server-only viem fallback transport and public client.
- Modify `lib/server/readWalletInvoices.ts`: consume the shared server client.
- Modify `lib/server/syncInvoiceEvents.ts`: consume the shared server client.
- Modify `app/api/v1/invoices/metadata/route.ts`: consume the shared server client for receipt/block verification.
- Modify `.env.example`: document `ARC_RPC_URL` without a real credential.
- Modify `tests/runtimeConfig.test.ts`: cover normalization, rejection, preference, fallback, and secret-safe errors.
- Create `tests/serverArcRpc.test.ts`: cover endpoint ordering, fallback, bounded attempts, and client/server separation.
- Modify `tests/arcSecurity.test.ts`: assert browser network configuration still uses the Circle public endpoint.

---

### Task 1: Validate server-only private RPC configuration

**Files:**
- Modify: `lib/server/internal/runtimeConfig.ts`
- Modify: `.env.example`
- Test: `tests/runtimeConfig.test.ts`

**Interfaces:**
- Produces: `ServerRuntimeConfig.rpcUrls: readonly [string, ...string[]]`
- Produces: `parseServerRuntimeConfig(env)` with optional `env.ARC_RPC_URL`
- Preserves: `ServerRuntimeConfig.rpcUrl` as the preferred URL for the existing metadata verification interface.

- [ ] **Step 1: Write failing configuration tests**

Add tests that pass `ARC_RPC_URL: " https://arc-testnet.g.alchemy.com/v2/test-key "` and assert:

```ts
assert.deepEqual(config.rpcUrls, [
  "https://arc-testnet.g.alchemy.com/v2/test-key",
  ARC_TESTNET.rpcUrl
]);
assert.equal(config.rpcUrl, "https://arc-testnet.g.alchemy.com/v2/test-key");
```

Add a no-private-endpoint case:

```ts
assert.deepEqual(config.rpcUrls, [ARC_TESTNET.rpcUrl]);
assert.equal(config.rpcUrl, ARC_TESTNET.rpcUrl);
```

Add invalid endpoint cases for HTTP, credentials, query/hash, localhost/private IP, and a non-Alchemy path. Assert `RuntimeConfigError.variables` contains `ARC_RPC_URL` and the thrown message does not contain the submitted URL or key.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test tests/runtimeConfig.test.ts`

Expected: FAIL because `rpcUrls` does not exist and `ARC_RPC_URL` is currently ignored.

- [ ] **Step 3: Implement minimal URL validation and ordered configuration**

In `lib/server/internal/runtimeConfig.ts`, add `ARC_RPC_URL` to the error variable union, normalize it with `URL`, require HTTPS, reject credentials/query/hash/port/private hosts, and require hostname `arc-testnet.g.alchemy.com` plus a non-empty `/v2/<key>` path. Return:

```ts
const rpcUrls = privateRpcUrl
  ? ([privateRpcUrl, ARC_TESTNET.rpcUrl] as const)
  : ([ARC_TESTNET.rpcUrl] as const);

return Object.freeze({
  supabaseUrl,
  supabaseServiceRoleKey,
  invoiceRegistryAddress,
  chainId: ARC_TESTNET.chainId,
  rpcUrl: rpcUrls[0],
  rpcUrls: Object.freeze(rpcUrls),
  explorerUrl: ARC_TESTNET.explorerUrl,
  usdcAddress: ARC_CONTRACTS.usdc
});
```

Document only the variable name in `.env.example`:

```dotenv
# Server-only private Arc Testnet endpoint. Never use NEXT_PUBLIC_ or commit a real key.
ARC_RPC_URL=
```

- [ ] **Step 4: Run configuration and security tests**

Run: `node --test tests/runtimeConfig.test.ts tests/arcSecurity.test.ts`

Expected: PASS, including the existing assertion that browser-facing `ARC_TESTNET.rpcUrl` remains Circle's public endpoint.

- [ ] **Step 5: Commit**

```bash
git add .env.example lib/server/internal/runtimeConfig.ts tests/runtimeConfig.test.ts tests/arcSecurity.test.ts
git commit -m "feat: validate private Arc RPC configuration"
```

---

### Task 2: Centralize server Arc transport with failover

**Files:**
- Create: `lib/server/arcRpc.ts`
- Create: `tests/serverArcRpc.test.ts`

**Interfaces:**
- Consumes: `getServerRuntimeConfig().rpcUrls`
- Produces: `createArcServerClient(rpcUrls?: readonly string[])`
- Produces: viem public client configured with deterministic primary/fallback ordering.

- [ ] **Step 1: Write a failing transport integration test**

Create two local Node HTTP JSON-RPC servers. The primary returns HTTP `429` or `503`; the fallback returns valid `eth_chainId` and `eth_blockNumber` results. Call `createArcServerClient([primaryUrl, fallbackUrl]).getBlockNumber()` and assert the result is `42n`, each server receives a bounded number of requests, and the test output never includes either full URL.

Add a second case where the primary returns a JSON-RPC contract error. Assert that error is returned and the fallback receives zero requests, preventing a revert from being disguised as an endpoint outage.

- [ ] **Step 2: Run the focused test and confirm failure**

Run: `node --test tests/serverArcRpc.test.ts`

Expected: FAIL with module-not-found for `lib/server/arcRpc.ts`.

- [ ] **Step 3: Implement the shared server-only client**

Create `lib/server/arcRpc.ts` beginning with `import "server-only";`. Build one `fallback` transport from ordered `http` transports:

```ts
const transports = rpcUrls.map((url) =>
  http(url, {
    timeout: 12_000,
    retryCount: 1,
    retryDelay: 400
  })
);

return createPublicClient({
  chain: arcTestnet,
  transport: fallback(transports, { rank: false, retryCount: 0 })
});
```

Use `getServerRuntimeConfig().rpcUrls` only when no explicit URLs are supplied. Do not log URLs or attach them to custom errors.

- [ ] **Step 4: Run transport and server-boundary tests**

Run: `node --test tests/serverArcRpc.test.ts tests/runtimeConfig.test.ts`

Expected: PASS; the transient primary failure reaches the fallback, while the contract error does not.

- [ ] **Step 5: Commit**

```bash
git add lib/server/arcRpc.ts tests/serverArcRpc.test.ts
git commit -m "feat: add Arc RPC server failover"
```

---

### Task 3: Migrate all server chain reads to the shared client

**Files:**
- Modify: `lib/server/readWalletInvoices.ts`
- Modify: `lib/server/syncInvoiceEvents.ts`
- Modify: `app/api/v1/invoices/metadata/route.ts`
- Test: `tests/serverArcRpc.test.ts`
- Test: `tests/walletInvoiceRoute.test.ts`
- Test: `tests/syncInvoiceEvents.test.ts`

**Interfaces:**
- Consumes: `createArcServerClient()` from Task 2.
- Preserves: current route response shapes, sync database calls, confirmation depth, metadata signatures, and user-facing error copy.

- [ ] **Step 1: Add failing static ownership checks**

In `tests/serverArcRpc.test.ts`, read the three production files and assert they import `createArcServerClient`; assert none directly call `http(ARC_TESTNET.rpcUrl)`, `http(config.rpcUrl)`, or `http(arcTestnet.rpcUrls.default.http[0])`.

- [ ] **Step 2: Run tests and confirm the ownership checks fail**

Run: `node --test tests/serverArcRpc.test.ts tests/walletInvoiceRoute.test.ts tests/syncInvoiceEvents.test.ts`

Expected: FAIL because all three modules still create their own public clients.

- [ ] **Step 3: Replace direct clients without changing business logic**

Use `createArcServerClient()` in `readWalletInvoices.ts` and `syncInvoiceEvents.ts`. In the metadata route, create the shared client after runtime validation and continue passing `config.rpcUrl` into signed metadata verification only as an internal compatibility field; receipt and block calls must use the shared client.

Keep existing route-level mapping:

```ts
if (error instanceof ArcRpcError) {
  return NextResponse.json({ error: "Arc RPC unavailable." }, { status: 502 });
}
```

Do not move the client to browser hooks and do not modify `hooks/usePayInvoice.ts` or `lib/chains.ts`.

- [ ] **Step 4: Run server route, sync, and security tests**

Run: `node --test tests/serverArcRpc.test.ts tests/walletInvoiceRoute.test.ts tests/syncInvoiceEvents.test.ts tests/runtimeConfig.test.ts tests/arcSecurity.test.ts`

Expected: PASS with identical API payloads and database behavior.

- [ ] **Step 5: Commit**

```bash
git add app/api/v1/invoices/metadata/route.ts lib/server/readWalletInvoices.ts lib/server/syncInvoiceEvents.ts tests/serverArcRpc.test.ts tests/walletInvoiceRoute.test.ts tests/syncInvoiceEvents.test.ts
git commit -m "refactor: route server reads through Arc RPC failover"
```

---

### Task 4: Full verification, secret scan, push, and Vercel rollout

**Files:**
- Modify only if required by a failing check; do not weaken assertions.
- Verify: `.env.example`, tracked files, production build, Git history, Vercel deployment.

**Interfaces:**
- Consumes: Alchemy HTTPS endpoint supplied by the user directly in Vercel.
- Produces: production deployment at `https://stflow-arc.vercel.app/` using private-first server reads.

- [ ] **Step 1: Run the complete local quality gate**

Run in order:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Expected: all commands exit `0`; Next.js production build completes without exposing `ARC_RPC_URL` in client output.

- [ ] **Step 2: Scan tracked source and build output for secrets**

Run:

```bash
git grep -n "arc-testnet.g.alchemy.com/v2/" -- . ":(exclude)docs/arc-custom-rpc-design.md" ":(exclude)docs/arc-custom-rpc-implementation-plan.md"
git grep -n "NEXT_PUBLIC_ARC_RPC_URL"
```

Expected: no matches. Also search `.next/static` for `ARC_RPC_URL` and the actual provider key; expected: no matches. Never paste the key into shell history or test fixtures.

- [ ] **Step 3: Add the private endpoint in Vercel**

In the `stflow` Vercel project, create `ARC_RPC_URL` as a Sensitive environment variable for Production and Preview only. Paste the Alchemy Arc Testnet HTTPS endpoint as the value. Do not enable Development and do not rename it with `NEXT_PUBLIC_`.

- [ ] **Step 4: Push the verified commits**

Run:

```bash
git status --short
git push origin main
```

Expected: clean status and successful push of `main` to `nixx66/stflow`.

- [ ] **Step 5: Verify Vercel build and production behavior**

Wait for the Git-connected Production deployment to become Ready. Open `https://stflow-arc.vercel.app/` and verify:

1. Overview, Invoices, Customers, Orders, Analytics, and Export load without an Arc RPC error.
2. Creating an invoice still opens MetaMask on chain `5042002` and does not expose the Alchemy URL.
3. The assigned payer can open and pay an invoice; another address remains blocked.
4. A confirmed `InvoicePaid` receipt remains `Payment confirmed` even if a later read temporarily fails.
5. Vercel function logs show successful server reads and contain no full Alchemy endpoint or provider key.
6. Temporarily replace the private endpoint with an unreachable HTTPS URL in Preview only, redeploy Preview, and confirm reads succeed through Circle fallback; restore the valid endpoint immediately afterward.

- [ ] **Step 6: Record deployment evidence**

Record the final Git commit SHA and Vercel Production deployment ID in the handoff message. Do not record environment-variable values.

