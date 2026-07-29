# Arc Invoice Production Cutover Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every production mock path, deploy the audited registry with the user's MetaMask approval, and verify the complete Arc Testnet workflow.

**Architecture:** Runtime code becomes fail-closed: a valid contract, RPC, wallet, and Supabase configuration are required. Deployment is a separately verified operation; the application consumes only the verified registry address.

**Tech Stack:** Next.js, Foundry artifacts, MetaMask, Arcscan, Supabase, Vercel

## Global Constraints

- Never request or handle the user's private key or seed phrase.
- Do not preserve mock or demo fallback behavior in production modules.
- Do not deploy unverified contract bytecode.
- Do not update Vercel until local and Arc Testnet smoke tests pass.
- Every production change starts with a failing test.

---

### Task 1: Remove production mock state

**Files:**
- Delete: `lib/mockData.ts`
- Delete: `lib/v2MockData.ts`
- Rewrite: `lib/invoice.ts`
- Rewrite: `lib/consoleInvoiceData.ts`
- Modify: `hooks/useInvoice.ts`
- Modify: `hooks/useDashboard.ts`
- Modify: `lib/serverInvoiceStore.ts`
- Modify: `app/dashboard/page.tsx`
- Modify: `app/console/page.tsx`
- Modify: `app/console/invoices/page.tsx`
- Modify: `app/resources/page.tsx`
- Modify: `README.md`
- Create: `tests/noProductionMocks.test.ts`

**Interfaces:**
- Produces: production code with no seeded data, generated hashes, local ledger, or demo wallet fallback

- [ ] **Step 1: Write the failing production-boundary test**

```ts
const productionRoots = ["app", "components", "hooks", "lib"];
const banned = [
  /createMockTxHash/,
  /createMockInvoice/,
  /MOCK_MERCHANT/,
  /mockInvoices/,
  /v2MockData/,
  /Mock settlement/,
  /Pay USDC \(Mock\)/
];

for (const file of sourceFiles(productionRoots)) {
  const source = readFileSync(file, "utf8");
  for (const pattern of banned) {
    assert.doesNotMatch(source, pattern, `${file} contains ${pattern}`);
  }
}
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/noProductionMocks.test.ts`

Expected: failures list the current production mock imports and copy.

- [ ] **Step 3: Remove runtime mock dependencies**

Delete the mock modules, replace invoice/dashboard reads with contract and API hooks, remove local-storage writes and seeded server files, and replace mock-specific copy with Arc Testnet copy.

- [ ] **Step 4: Preserve test fixtures correctly**

Move reusable fixtures to `tests/fixtures/invoices.ts`. Production files must not import from `tests`.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
node --test tests/noProductionMocks.test.ts
npm.cmd test
npm.cmd run typecheck
npm.cmd run build
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add -A
git commit -m "refactor: remove production mock workflows"
```

### Task 2: Local end-to-end contract integration

**Files:**
- Create: `contracts/script/DeployLocal.s.sol`
- Create: `tests/arcInvoice.integration.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: local Anvil registry and test USDC addresses
- Produces: repeatable create, approve, pay, and receipt test

- [ ] **Step 1: Write the failing integration test**

The test starts from known Anvil accounts, creates an invoice, verifies the merchant/payer/amount/hash, approves exactly the amount, pays, verifies merchant balance change, verifies registry balance zero, and decodes `InvoicePaid`.

- [ ] **Step 2: Verify RED**

Run: `pnpm test:integration`

Expected: failure because the local deployment command and environment are absent.

- [ ] **Step 3: Add deterministic local deployment**

Start Anvil, deploy `MockUSDC` and `STFlowInvoiceRegistry`, mint only to test accounts, and export addresses to the test process. Test-only private keys remain Anvil defaults and never enter production environment files.

- [ ] **Step 4: Verify GREEN**

Run:

```powershell
forge test
pnpm test:integration
pnpm test
pnpm typecheck
pnpm build
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit**

```powershell
git add contracts/script/DeployLocal.s.sol tests/arcInvoice.integration.test.ts package.json pnpm-lock.yaml
git commit -m "test: cover Arc invoice lifecycle"
```

### Task 3: User-signed Arc Testnet deployment

**Files:**
- Create: `docs/arc-testnet-deployment.md`
- Create: `contracts/deployment/arc-testnet.json`

**Interfaces:**
- Produces: verified registry address and deployment transaction hash

- [ ] **Step 1: Re-run release checks**

Run:

```powershell
forge fmt --check
forge test -vv
forge build --sizes
pnpm test
pnpm typecheck
pnpm build
```

Expected: every command exits 0.

- [ ] **Step 2: Verify the deployer's wallet**

The user selects Arc Testnet in MetaMask, confirms chain id `5042002`, confirms the account holds enough testnet USDC for gas, and verifies the compiled constructor argument is exactly `0x3600000000000000000000000000000000000000`.

- [ ] **Step 3: Deploy through a user-confirmed wallet transaction**

Use Remix with the repository's exact compiled source and injected MetaMask provider. The user reviews and confirms the deployment transaction. Do not paste a private key into Remix, shell commands, chat, or environment files.

- [ ] **Step 4: Validate deployment**

Read bytecode with `eth_getCode`, call `usdc()`, compare runtime bytecode to the local artifact, and record the returned address, deployment hash, block number, compiler version, optimizer settings, and source commit in `contracts/deployment/arc-testnet.json`.

- [ ] **Step 5: Verify source on Arcscan**

Publish the exact source, Solidity `0.8.30`, optimizer enabled with 200 runs, and constructor argument. Confirm Arcscan reports a verified contract before continuing.

- [ ] **Step 6: Commit deployment metadata**

```powershell
git add docs/arc-testnet-deployment.md contracts/deployment/arc-testnet.json
git commit -m "docs: record verified Arc registry deployment"
```

### Task 4: Supabase and Vercel configuration

**Files:**
- Modify: `.env.example`
- Modify: `docs/supabase-setup.md`

**Interfaces:**
- Produces: configured production runtime without committing secrets

- [ ] **Step 1: Create and migrate Supabase**

The user creates the project, runs the committed migration, and confirms RLS. Store `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ARC_RPC_URL`, `CRON_SECRET`, and `NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS` in Vercel project settings. Only the registry address may use `NEXT_PUBLIC_`.

- [ ] **Step 2: Run the configuration health check**

Call the server health endpoint and require valid RPC chain id, deployed registry bytecode, registry USDC address, and a successful Supabase query. Never return secret values.

- [ ] **Step 3: Run the Arc Testnet smoke flow**

With merchant wallet A and assigned payer wallet B:

1. A creates an invoice and confirms the Arc transaction.
2. C opens the payment link and is rejected by both UI and contract simulation.
3. B approves the exact amount and pays.
4. Merchant balance increases by the exact invoice amount.
5. Registry balance remains zero.
6. Receipt and dashboard show the confirmed payment transaction.
7. Wallet disconnect works from the shared menu.

- [ ] **Step 4: Record evidence**

Record create, approval, and payment Arcscan links plus the tested commit in `docs/arc-testnet-deployment.md`. Do not record wallet secrets, signed raw transactions, or Supabase secrets.

### Task 5: Production deployment

**Files:**
- No source changes expected

**Interfaces:**
- Produces: verified `https://stflow-arc.vercel.app`

- [ ] **Step 1: Verify the exact Git state**

Run:

```powershell
git status --short
git rev-parse HEAD
pnpm test
pnpm typecheck
pnpm build
```

Expected: clean status and all checks pass.

- [ ] **Step 2: Push and deploy**

Push the verified commit to `nixx66/stflow` main, deploy that exact source to Vercel production, and assign `stflow-arc.vercel.app`.

- [ ] **Step 3: Verify production**

Require HTTP 200, valid runtime health, correct Arc chain id and registry address, and one read-only invoice lookup. Do not submit another financial transaction solely for availability testing.

