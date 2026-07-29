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
policy; all reads and writes go through authenticated server routes.

## Configure server secrets

Copy the project URL and service-role key from the Supabase project settings.
Set these only in the local server environment and Vercel project secrets:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

Never prefix either variable with `NEXT_PUBLIC_`. Never place the service-role
key in browser code, Git, screenshots, issue trackers, or chat. If a key is
exposed, rotate it immediately in Supabase, replace it in every server
environment, and redeploy.

Use separate Supabase projects and keys for local/test and production
environments. Production server routes must fail closed when either variable is
missing.

## Configure Arc

The Arc Testnet network is fixed by the application:

```text
Chain ID: 5042002
RPC: https://rpc.testnet.arc.network
USDC: 0x3600000000000000000000000000000000000000
Explorer: https://testnet.arcscan.app
```

Keep the RPC URL and chain ID in reviewed server source unless operations
require an override. The deployed invoice registry address is environment
specific and must be set after deployment:

```text
NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS=0x...
```

The registry address is public configuration. Verify it against the deployment
transaction on ArcScan before adding it to local or Vercel settings.

## Smoke verification after setup

Remote verification remains pending until the project and registry exist.
After configuration:

1. Create an invoice from the connected merchant wallet and confirm its
   `InvoiceCreated` event on ArcScan.
2. Confirm one normalized metadata row exists with the same invoice ID,
   registry address, transaction hash, block number, log index, amount, payer,
   merchant, deadline, and metadata hash.
3. Request the invoice through the server API and confirm no service-role key is
   present in the browser network response or JavaScript bundle.
4. Pay from the assigned payer wallet. Confirm the index changes to `paid` only
   after the Arc transaction succeeds.
5. Run the chain sync twice over the same block range. Confirm the second run
   creates no duplicate processed event.
6. Disconnect Supabase configuration in a non-production environment and
   confirm metadata writes fail instead of falling back to browser storage.
