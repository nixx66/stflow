create table public.invoice_metadata (
  invoice_id text not null
    check (invoice_id ~ '^0x[0-9a-f]{64}$'),
  chain_id bigint not null default 5042002
    check (chain_id = 5042002),
  registry_address text not null
    check (registry_address ~ '^0x[0-9a-f]{40}$'),
  merchant_wallet text not null
    check (merchant_wallet ~ '^0x[0-9a-f]{40}$'),
  payer_wallet text not null
    check (payer_wallet ~ '^0x[0-9a-f]{40}$'),
  customer_name text not null default ''
    check (length(customer_name) <= 200),
  title text not null
    check (length(title) between 1 and 200),
  description text not null default ''
    check (length(description) <= 5000),
  memo text not null default ''
    check (length(memo) <= 1000),
  canonical_metadata jsonb not null
    check (
      jsonb_typeof(canonical_metadata) = 'object'
      and pg_column_size(canonical_metadata) <= 65536
    ),
  metadata_hash text not null
    check (metadata_hash ~ '^0x[0-9a-f]{64}$'),
  amount_raw numeric(39, 0) not null
    check (amount_raw > 0 and amount_raw <= 340282366920938463463374607431768211455),
  created_chain_at numeric(20, 0) not null
    check (created_chain_at between 0 and 18446744073709551615),
  due_chain_at numeric(20, 0) not null
    check (
      due_chain_at between 0 and 18446744073709551615
      and due_chain_at > created_chain_at
    ),
  paid_chain_at numeric(20, 0)
    check (
      paid_chain_at is null
      or (
        paid_chain_at between 0 and 18446744073709551615
        and paid_chain_at >= created_chain_at
      )
    ),
  cancelled_chain_at numeric(20, 0)
    check (
      cancelled_chain_at is null
      or (
        cancelled_chain_at between 0 and 18446744073709551615
        and cancelled_chain_at >= created_chain_at
      )
    ),
  create_tx_hash text not null
    check (create_tx_hash ~ '^0x[0-9a-f]{64}$'),
  create_block_number bigint not null
    check (create_block_number >= 0),
  create_log_index integer not null
    check (create_log_index between 0 and 2147483647),
  indexed_status text not null default 'pending'
    check (indexed_status in ('pending', 'paid', 'cancelled')),
  payment_tx_hash text
    check (payment_tx_hash is null or payment_tx_hash ~ '^0x[0-9a-f]{64}$'),
  payment_block_number bigint
    check (payment_block_number is null or payment_block_number >= create_block_number),
  payment_log_index integer
    check (payment_log_index is null or payment_log_index between 0 and 2147483647),
  cancellation_tx_hash text
    check (cancellation_tx_hash is null or cancellation_tx_hash ~ '^0x[0-9a-f]{64}$'),
  cancellation_block_number bigint
    check (cancellation_block_number is null or cancellation_block_number >= create_block_number),
  cancellation_log_index integer
    check (cancellation_log_index is null or cancellation_log_index between 0 and 2147483647),
  inserted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (chain_id, registry_address, invoice_id),
  unique (chain_id, registry_address, create_tx_hash, create_log_index),
  check (merchant_wallet <> payer_wallet),
  check (
    (indexed_status = 'pending'
      and payment_tx_hash is null
      and payment_block_number is null
      and payment_log_index is null
      and paid_chain_at is null
      and cancellation_tx_hash is null
      and cancellation_block_number is null
      and cancellation_log_index is null
      and cancelled_chain_at is null)
    or
    (indexed_status = 'paid'
      and payment_tx_hash is not null
      and payment_block_number is not null
      and payment_log_index is not null
      and (
        payment_block_number > create_block_number
        or (
          payment_block_number = create_block_number
          and payment_log_index > create_log_index
        )
      )
      and paid_chain_at is not null
      and cancellation_tx_hash is null
      and cancellation_block_number is null
      and cancellation_log_index is null
      and cancelled_chain_at is null)
    or
    (indexed_status = 'cancelled'
      and cancellation_tx_hash is not null
      and cancellation_block_number is not null
      and cancellation_log_index is not null
      and (
        cancellation_block_number > create_block_number
        or (
          cancellation_block_number = create_block_number
          and cancellation_log_index > create_log_index
        )
      )
      and cancelled_chain_at is not null
      and payment_tx_hash is null
      and payment_block_number is null
      and payment_log_index is null
      and paid_chain_at is null)
  )
);

create table public.wallet_nonces (
  wallet text not null
    check (wallet ~ '^0x[0-9a-f]{40}$'),
  nonce_hash text not null
    check (nonce_hash ~ '^[0-9a-f]{64}$'),
  action text not null
    check (action in ('create_invoice', 'list_invoices')),
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  primary key (wallet, nonce_hash),
  unique (nonce_hash),
  check (expires_at > issued_at and expires_at <= issued_at + interval '10 minutes'),
  check (
    consumed_at is null
    or (consumed_at >= issued_at and consumed_at <= expires_at)
  )
);

create table public.chain_sync_cursor (
  chain_id bigint not null
    check (chain_id = 5042002),
  registry_address text not null
    check (registry_address ~ '^0x[0-9a-f]{40}$'),
  last_confirmed_block bigint not null
    check (last_confirmed_block >= 0),
  last_confirmed_block_hash text not null
    check (last_confirmed_block_hash ~ '^0x[0-9a-f]{64}$'),
  updated_at timestamptz not null default now(),
  primary key (chain_id, registry_address)
);

create table public.processed_chain_events (
  chain_id bigint not null
    check (chain_id = 5042002),
  registry_address text not null
    check (registry_address ~ '^0x[0-9a-f]{40}$'),
  tx_hash text not null
    check (tx_hash ~ '^0x[0-9a-f]{64}$'),
  log_index integer not null
    check (log_index between 0 and 2147483647),
  block_number bigint not null
    check (block_number >= 0),
  invoice_id text not null
    check (invoice_id ~ '^0x[0-9a-f]{64}$'),
  event_name text not null
    check (event_name in ('InvoiceCreated', 'InvoicePaid', 'InvoiceCancelled')),
  processed_at timestamptz not null default now(),
  primary key (chain_id, registry_address, tx_hash, log_index)
);

create index invoice_metadata_merchant_idx
  on public.invoice_metadata (
    chain_id,
    registry_address,
    merchant_wallet,
    indexed_status,
    create_block_number desc
  );
create index invoice_metadata_payer_idx
  on public.invoice_metadata (
    chain_id,
    registry_address,
    payer_wallet,
    indexed_status,
    create_block_number desc
  );
create index invoice_metadata_status_idx
  on public.invoice_metadata (
    chain_id,
    registry_address,
    indexed_status,
    create_block_number desc
  );
create index wallet_nonces_expiry_idx
  on public.wallet_nonces (expires_at)
  where consumed_at is null;
create index processed_chain_events_invoice_idx
  on public.processed_chain_events (
    chain_id,
    registry_address,
    invoice_id,
    block_number,
    log_index
  );
create index processed_chain_events_block_idx
  on public.processed_chain_events (
    chain_id,
    registry_address,
    block_number,
    log_index
  );

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger invoice_metadata_set_updated_at
before update on public.invoice_metadata
for each row execute function public.set_updated_at();

create trigger chain_sync_cursor_set_updated_at
before update on public.chain_sync_cursor
for each row execute function public.set_updated_at();

alter table public.invoice_metadata enable row level security;
alter table public.wallet_nonces enable row level security;
alter table public.chain_sync_cursor enable row level security;
alter table public.processed_chain_events enable row level security;

alter table public.invoice_metadata force row level security;
alter table public.wallet_nonces force row level security;
alter table public.chain_sync_cursor force row level security;
alter table public.processed_chain_events force row level security;

revoke all on table public.invoice_metadata from public, anon, authenticated;
revoke all on table public.wallet_nonces from public, anon, authenticated;
revoke all on table public.chain_sync_cursor from public, anon, authenticated;
revoke all on table public.processed_chain_events from public, anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
