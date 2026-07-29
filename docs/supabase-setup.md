# Supabase setup

The Supabase database stores invoice display metadata and an index of confirmed
Arc events. The `STFlowInvoiceRegistry` contract remains the authority for
invoice ownership, amount, deadline, and status.

This migration has not been applied to a remote project. Create and configure a
Supabase project before enabling the server routes.

## Create the project

1. Create a Supabase project from the Supabase dashboard and choose a strong
   database password. Store the password in a password manager.
2. Open **SQL Editor** and run
   `supabase/migrations/202607290001_arc_invoices.sql`.
3. Alternatively, link the Supabase CLI to the intended project and run:

   ```powershell
   supabase link --project-ref <project-ref>
   supabase db push
   ```

   Check the linked project name and reference before approving the push.

The migration creates:

- `invoice_metadata`, containing private display metadata plus the Arc event
  references used to verify it.
- `wallet_nonces`, containing hashed, expiring, one-time wallet challenges.
- `chain_sync_cursor`, recording the last fully processed confirmed block.
- `processed_chain_events`, making event indexing idempotent by transaction and
  log index.

Arc timestamps are stored as integer Unix seconds from the chain. USDC amounts
are stored as raw 6-decimal integers, not floating-point values.

The same invoice ID may exist in different registry deployments. Every server
query and mutation must identify a row by `(chain_id, registry_address,
invoice_id)`, and list queries must filter on the configured active registry.
Historical registry rows remain available for reconciliation after an upgrade.
Processed events carry the same chain, registry, and invoice identity. They do
not use a foreign key because the indexer may observe a valid onchain invoice
whose private metadata was never submitted.

This migration is intentionally one-time rather than idempotent. Apply it once
to a new database and use a new numbered migration for later schema changes.

## Verify database access

In **Table Editor**, confirm Row Level Security is enabled for all four tables
and that no policies grant browser access. In **SQL Editor**, run:

```sql
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'invoice_metadata',
    'wallet_nonces',
    'chain_sync_cursor',
    'processed_chain_events'
  )
order by c.relname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'invoice_metadata',
    'wallet_nonces',
    'chain_sync_cursor',
    'processed_chain_events'
  )
  and grantee in ('anon', 'authenticated', 'PUBLIC');
```

The first query must show `true` for both RLS columns. The second query must
return no rows. The migration intentionally creates no permissive browser
policy.

Production `/api/v1` metadata and signed-wallet routes do not exist yet; they
are delivered by the next implementation tasks. Existing legacy routes are not
an acceptable production path and must not receive the service-role key. Until
the server routes, receipt verification, and strict runtime configuration are
implemented and tested, database-backed metadata writes remain disabled.

## Configure server secrets

Copy the project URL and service-role key from the Supabase project settings.
Set these only in the local server environment and Vercel project secrets:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Never prefix either variable with `NEXT_PUBLIC_`. Public Supabase URL or anon
variables are not required by this server-only design. Never place the
service-role key in browser code, Git, screenshots, issue trackers, or chat. If
a key is exposed, rotate it immediately in Supabase, replace it in every server
environment, and redeploy.

The example environment uses only the server-side variables above. The
application validates them when a server database operation starts; importing
the module alone does not read secrets or create a client.

Use separate Supabase projects and keys for local/test and production
environments. The target production routes must fail closed when either
variable is missing. That behavior is not complete until the strict runtime
configuration task is implemented and verified.

## Configure Arc

The Arc Testnet network is fixed by the application:

```text
Chain ID: 5042002
RPC: https://rpc.testnet.arc.network
USDC: 0x3600000000000000000000000000000000000000
Explorer: https://testnet.arcscan.app
```

The RPC URL, chain ID, explorer, and USDC address are pinned in reviewed source
and cannot be overridden through the environment. The deployed invoice
registry address is environment
specific and must be set after deployment:

```text
NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS=0x...
```

The registry address is public configuration. Verify it against the deployment
transaction on ArcScan before adding it to local or Vercel settings.

## Server invariants for the next tasks

Normalize every EVM address, bytes32 value, and transaction hash to lowercase
before a database query or mutation. The database rejects mixed-case values;
tests must cover that server/indexer normalization rather than relying on the
database to transform input.

Before inserting metadata, the server must:

1. Decode and validate the canonical metadata object against an explicit
   schema.
2. Reject a request body larger than 96 KiB before JSON parsing. Serialize the
   validated metadata deterministically, reject canonical metadata larger than
   64 KiB, and recompute its keccak256 metadata hash.
3. Fetch the confirmed Arc receipt and compare the registry, invoice ID,
   merchant, payer, raw amount, deadline, and recomputed metadata hash with the
   `InvoiceCreated` event.
4. Upsert by `(chain_id, registry_address, invoice_id)` only after every
   comparison succeeds.

Do not trust a browser-supplied canonical JSON string or metadata hash.

Store only a digest of each random nonce. A challenge must bind the wallet,
action, chain ID, registry address, issued time, expiry, nonce, and the payload
or metadata hash being authorized. After signature verification, authorization
must depend on a single atomic conditional nonce consume; never use a
select-then-update sequence. Implement the consume as a server-only database
function whose transaction contains a statement equivalent to:

```sql
update public.wallet_nonces
set consumed_at = now()
where wallet = :wallet
  and nonce_hash = :nonce_hash
  and action = :action
  and consumed_at is null
  and expires_at > now()
returning wallet;
```

Exactly one returned row is required. Signature verification alone does not
consume a challenge, and a consumed or expired challenge must fail.

The chain indexer must lock the matching `chain_sync_cursor` row with
`FOR UPDATE`, fetch a bounded confirmed range, and sort logs by block number,
transaction index, then log index. Applying event mutations, inserting
`processed_chain_events`, and advancing the cursor must commit atomically in
the same transaction. Duplicate event keys must be harmless without skipping
the associated state transition.

Use a documented confirmation depth before indexing. Persist the confirmed
block hash with the cursor and compare it with Arc before processing the next
range. Derive event times from the corresponding Arc block timestamp, not
server wall-clock time. A mismatched block hash must stop automatic indexing;
the current schema does not contain enough block history to choose a safe
rewind point automatically.

Recovery is an explicit, bounded operator action for one chain and registry.
Keep public metadata routes and scheduled sync disabled until it finishes:

1. Choose `rewind_block` at or before the suspected fork and no earlier than
   the registry deployment block. Fetch the canonical confirmed logs through
   the recovery head, then record the current cursor and affected invoice IDs
   before changing data.
2. In one database transaction, lock the deployment cursor with `FOR UPDATE`,
   delete `processed_chain_events` at or after `rewind_block`, reset any
   payment or cancellation at or after the rewind point to `pending`, delete a
   row whose create is at or after the rewind point when no canonical
   replacement create exists, and reset the cursor to `rewind_block - 1` with
   that canonical block's hash.
3. Fetch canonical logs from `rewind_block` through the confirmed head in
   bounded ranges. For every affected invoice, rebuild create, payment, and
   cancellation provenance in block/log order. A canonical create keeps its
   private metadata only when the recomputed hash still matches. If its create
   is orphaned and no canonical replacement exists, delete the
   `invoice_metadata` row; a later re-mined create requires metadata
   resubmission. If only a pay or cancel is orphaned, clear that transition,
   restore `pending`, and apply any canonical replacement transition.
4. Commit each bounded range using the normal atomic event-mutation-cursor
   transaction. Stop and alert on a metadata mismatch or another block-hash
   mismatch; never advance the cursor past an unresolved range.

An initial backfill starts at the verified registry deployment block and uses
the same ordered, idempotent projection. The event table deliberately has no
metadata foreign key, so canonical creates without submitted private metadata
can still be indexed.

`indexed_status = 'pending'` mirrors the contract enum. Expiry is a read-time
state derived from a pending invoice whose `due_chain_at` is at or before the
current confirmed chain time; the indexer must not persist `expired` as a
contract status.

## Smoke verification after setup

Remote verification remains pending until the project and registry exist.
After configuration:

1. Create an invoice from the connected merchant wallet and confirm its
   `InvoiceCreated` event on ArcScan.
2. Confirm one normalized metadata row exists with the same invoice ID,
   registry address, transaction hash, block number, log index, amount, payer,
   merchant, deadline, and metadata hash.
3. After the production `/api/v1` route is implemented, request the invoice
   through it and confirm no service-role key is present in the browser network
   response or JavaScript bundle.
4. Pay from the assigned payer wallet. Confirm the index changes to `paid` only
   after the Arc transaction succeeds.
5. Run the chain sync twice over the same block range. Confirm the second run
   creates no duplicate processed event.
6. Disconnect Supabase configuration in a non-production environment and
   confirm metadata writes fail instead of falling back to browser storage.
