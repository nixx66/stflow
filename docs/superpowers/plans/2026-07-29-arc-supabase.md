# Arc Invoice Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist private-facing invoice metadata and index chain-confirmed state without allowing the database to override the Arc contract.

**Architecture:** Server-only Supabase clients use the service role. Public APIs expose minimal invoice metadata; signed nonces bind merchant writes to the connected wallet, and chain receipts are validated before persistence.

**Tech Stack:** Supabase PostgreSQL, Next.js route handlers, viem signature verification, Arc JSON-RPC

## Global Constraints

- Service-role keys never use the `NEXT_PUBLIC_` prefix.
- Browser code has no direct write access.
- Database status never overrides contract status.
- Missing configuration disables writes; it never enables local fallback.
- Every production change starts with a failing test.

---

### Task 1: Schema and Row Level Security

**Files:**
- Create: `supabase/migrations/202607290001_arc_invoices.sql`
- Create: `docs/supabase-setup.md`

**Interfaces:**
- Produces: `invoice_metadata`, `wallet_nonces`, and `chain_sync_cursor` tables

- [ ] **Step 1: Add the schema**

```sql
create table public.invoice_metadata (
  invoice_id text primary key check (invoice_id ~ '^0x[0-9a-f]{64}$'),
  merchant_wallet text not null,
  payer_wallet text not null,
  customer_name text not null default '',
  title text not null,
  description text not null default '',
  memo text not null default '',
  canonical_metadata jsonb not null,
  metadata_hash text not null,
  create_tx_hash text not null unique,
  create_block_number bigint not null,
  indexed_status text not null check (indexed_status in ('pending','paid','cancelled')),
  payment_tx_hash text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallet_nonces (
  wallet text primary key,
  nonce text not null,
  expires_at timestamptz not null
);

alter table public.invoice_metadata enable row level security;
alter table public.wallet_nonces enable row level security;
revoke all on public.invoice_metadata from anon, authenticated;
revoke all on public.wallet_nonces from anon, authenticated;
```

- [ ] **Step 2: Document secure project setup**

Document creating the Supabase project, running the migration, placing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only in local/Vercel server secrets, and rotating any key exposed to Git or browser code.

- [ ] **Step 3: Verify schema**

Run the migration in Supabase SQL Editor and confirm both tables show RLS enabled with no browser write policy.

- [ ] **Step 4: Commit**

```powershell
git add supabase/migrations/202607290001_arc_invoices.sql docs/supabase-setup.md
git commit -m "feat: add secure invoice metadata schema"
```

### Task 2: Server-only database and configuration

**Files:**
- Create: `lib/server/supabase.ts`
- Create: `lib/server/runtimeConfig.ts`
- Create: `tests/runtimeConfig.test.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `getSupabaseAdmin()`
- Produces: `getServerRuntimeConfig(env)`

- [ ] **Step 1: Write failing configuration tests**

```ts
assert.throws(
  () => getServerRuntimeConfig({}),
  /SUPABASE_URL/
);
assert.doesNotThrow(
  () => getServerRuntimeConfig({
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "sb_secret_example-service-role-key",
    NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS: REGISTRY,
    ARC_RPC_URL: "https://ignored.example"
  })
);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/runtimeConfig.test.ts`

Expected: module import fails.

- [ ] **Step 3: Implement strict configuration**

Validate URL, service-key shape, and EVM address formats and return an immutable config object. Arc chain ID, RPC, explorer, and USDC remain fixed source constants. Throw a named `RuntimeConfigError` listing only missing or invalid variable names; never log secret values.

- [ ] **Step 4: Create the server client**

Instantiate `@supabase/supabase-js` with session persistence and token refresh disabled. Import the module only from server routes and server utilities.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
node --test tests/runtimeConfig.test.ts
npm.cmd run typecheck
```

Expected: both commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add lib/server/supabase.ts lib/server/runtimeConfig.ts tests/runtimeConfig.test.ts .env.example
git commit -m "feat: add strict server runtime configuration"
```

### Task 3: Signed metadata persistence

**Files:**
- Create: `app/api/auth/nonce/route.ts`
- Create: `app/api/invoices/route.ts`
- Create: `lib/server/walletAuth.ts`
- Create: `lib/server/verifyInvoiceCreation.ts`
- Modify: `tests/invoiceApiPayload.test.ts`
- Create: `tests/walletAuth.test.ts`

**Interfaces:**
- Produces: one-time wallet nonce challenge
- Produces: `verifyWalletAuthorization(message,signature,expectedWallet)`
- Produces: receipt and event verification before insert

- [ ] **Step 1: Write failing signature tests**

Use viem test accounts to sign a fixed challenge. Assert the expected wallet succeeds, another wallet fails, and an expired nonce fails.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/walletAuth.test.ts`

Expected: import fails.

- [ ] **Step 3: Implement nonce verification**

Challenges include domain, wallet, action, nonce, issued time, and expiry. Consume the nonce in the same request that verifies the signature so it cannot be replayed.

- [ ] **Step 4: Verify the create transaction**

Fetch the Arc receipt, require `status === "success"`, require the configured registry address, decode `InvoiceCreated`, and compare id, merchant, payer, amount, deadline, and metadata hash with the request before inserting metadata.

- [ ] **Step 5: Add minimal read API**

`GET /api/invoices?invoiceId=<bytes32>` returns only the metadata for that invoice. Wallet-scoped list endpoints require a signed challenge and filter normalized merchant or payer addresses.

- [ ] **Step 6: Verify**

Run:

```powershell
node --test tests/walletAuth.test.ts tests/invoiceApiPayload.test.ts
npm.cmd test
npm.cmd run typecheck
```

Expected: all commands exit 0.

- [ ] **Step 7: Commit**

```powershell
git add app/api/auth/nonce/route.ts app/api/invoices/route.ts lib/server/walletAuth.ts lib/server/verifyInvoiceCreation.ts tests/walletAuth.test.ts tests/invoiceApiPayload.test.ts
git commit -m "feat: verify and persist onchain invoice metadata"
```

### Task 4: Chain event synchronization

**Files:**
- Create: `app/api/internal/sync-chain/route.ts`
- Create: `lib/server/syncInvoiceEvents.ts`
- Create: `tests/syncInvoiceEvents.test.ts`
- Create: `vercel.json`

**Interfaces:**
- Produces: idempotent event sync from `chain_sync_cursor`
- Consumes: `InvoiceCreated`, `InvoicePaid`, `InvoiceCancelled`

- [ ] **Step 1: Write failing idempotency tests**

Feed the same decoded event batch twice and assert one database mutation per unique `(txHash,logIndex)`. Assert the cursor advances only after the full batch succeeds.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/syncInvoiceEvents.test.ts`

Expected: module import fails.

- [ ] **Step 3: Implement bounded synchronization**

Read at most 2,000 blocks per request, process logs in block/log order, upsert only chain-derived fields, and store the final confirmed block after the transaction completes.

- [ ] **Step 4: Protect the route**

Require `Authorization: Bearer ${CRON_SECRET}` with a constant-time comparison. Configure Vercel Cron to call the route every minute.

- [ ] **Step 5: Verify**

Run:

```powershell
node --test tests/syncInvoiceEvents.test.ts
npm.cmd run typecheck
npm.cmd run build
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit**

```powershell
git add app/api/internal/sync-chain/route.ts lib/server/syncInvoiceEvents.ts tests/syncInvoiceEvents.test.ts vercel.json
git commit -m "feat: index Arc invoice events"
```

