create table public.metadata_rate_limits (
  route text not null check (route ~ '^[a-z0-9:_-]{1,100}$'),
  bucket_kind text not null check (bucket_kind in ('wallet', 'client')),
  bucket_key text not null check (bucket_key ~ '^(0x[0-9a-f]{40}|[0-9a-f]{64})$'),
  window_started_at timestamptz not null,
  request_count integer not null check (request_count > 0),
  expires_at timestamptz not null check (expires_at > window_started_at),
  primary key (route, bucket_kind, bucket_key, window_started_at)
);
create index metadata_rate_limits_expiry_idx
  on public.metadata_rate_limits (expires_at);

alter table public.metadata_rate_limits enable row level security;
alter table public.metadata_rate_limits force row level security;
revoke all on table public.metadata_rate_limits from public, anon, authenticated;

create function public.consume_metadata_rate_limit(
  p_route text,
  p_wallet text,
  p_client_hash text,
  p_wallet_limit integer,
  p_client_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_window timestamptz;
  v_wallet_count integer;
  v_client_count integer;
begin
  if p_wallet_limit < 1 or p_wallet_limit > 100
    or p_client_limit < 1 or p_client_limit > 100
    or p_window_seconds < 10 or p_window_seconds > 3600
    or p_route !~ '^[a-z0-9:_-]{1,100}$'
    or p_wallet !~ '^0x[0-9a-f]{40}$'
    or p_client_hash !~ '^[0-9a-f]{64}$'
  then
    raise exception using errcode = '22023', message = 'STFLOW_RATE_CONFIG';
  end if;

  v_window := pg_catalog.to_timestamp(
    pg_catalog.floor(pg_catalog.date_part('epoch', v_now) / p_window_seconds) * p_window_seconds
  );

  delete from public.metadata_rate_limits where expires_at <= v_now;
  delete from public.wallet_nonces where expires_at <= v_now;

  insert into public.metadata_rate_limits (
    route, bucket_kind, bucket_key, window_started_at, request_count, expires_at
  ) values (
    p_route, 'wallet', p_wallet, v_window, 1,
    v_window + pg_catalog.make_interval(secs => p_window_seconds)
  )
  on conflict (route, bucket_kind, bucket_key, window_started_at)
  do update set request_count = public.metadata_rate_limits.request_count + 1
  returning request_count into v_wallet_count;

  insert into public.metadata_rate_limits (
    route, bucket_kind, bucket_key, window_started_at, request_count, expires_at
  ) values (
    p_route, 'client', p_client_hash, v_window, 1,
    v_window + pg_catalog.make_interval(secs => p_window_seconds)
  )
  on conflict (route, bucket_kind, bucket_key, window_started_at)
  do update set request_count = public.metadata_rate_limits.request_count + 1
  returning request_count into v_client_count;

  return v_client_count <= p_client_limit
    and v_wallet_count <= p_wallet_limit;
end;
$$;

create function public.persist_invoice_metadata(
  p_wallet text,
  p_nonce_hash text,
  p_invoice_id text,
  p_chain_id bigint,
  p_registry_address text,
  p_merchant_wallet text,
  p_payer_wallet text,
  p_customer_name text,
  p_title text,
  p_description text,
  p_memo text,
  p_canonical_metadata jsonb,
  p_metadata_hash text,
  p_amount_raw numeric,
  p_created_chain_at numeric,
  p_due_chain_at numeric,
  p_create_tx_hash text,
  p_create_block_number bigint,
  p_create_log_index integer
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_nonce public.wallet_nonces%rowtype;
  v_row public.invoice_metadata%rowtype;
begin
  if p_wallet <> p_merchant_wallet then
    raise exception using errcode = 'P0001', message = 'STFLOW_NONCE_INVALID';
  end if;

  select * into v_nonce
  from public.wallet_nonces
  where wallet = p_wallet
    and nonce_hash = p_nonce_hash
    and action = 'create_invoice'
    and consumed_at is null
    and expires_at > v_now
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'STFLOW_NONCE_INVALID';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_registry_address || ':' || p_invoice_id, 0)
  );

  select * into v_row
  from public.invoice_metadata
  where chain_id = p_chain_id
    and registry_address = p_registry_address
    and invoice_id = p_invoice_id
  for update;

  if found then
    if v_row.merchant_wallet = p_merchant_wallet
      and v_row.payer_wallet = p_payer_wallet
      and v_row.customer_name = p_customer_name
      and v_row.title = p_title
      and v_row.description = p_description
      and v_row.memo = p_memo
      and v_row.canonical_metadata is not distinct from p_canonical_metadata
      and v_row.metadata_hash = p_metadata_hash
      and v_row.amount_raw = p_amount_raw
      and v_row.created_chain_at = p_created_chain_at
      and v_row.due_chain_at = p_due_chain_at
      and v_row.create_tx_hash = p_create_tx_hash
      and v_row.create_block_number = p_create_block_number
      and v_row.create_log_index = p_create_log_index
    then
      update public.wallet_nonces set consumed_at = v_now
      where wallet = p_wallet and nonce_hash = p_nonce_hash;
      return 'idempotent';
    end if;
    raise exception using errcode = 'P0001', message = 'STFLOW_METADATA_CONFLICT';
  end if;

  insert into public.invoice_metadata (
    invoice_id, chain_id, registry_address, merchant_wallet, payer_wallet,
    customer_name, title, description, memo, canonical_metadata, metadata_hash,
    amount_raw, created_chain_at, due_chain_at, create_tx_hash,
    create_block_number, create_log_index, indexed_status
  ) values (
    p_invoice_id, p_chain_id, p_registry_address, p_merchant_wallet, p_payer_wallet,
    p_customer_name, p_title, p_description, p_memo, p_canonical_metadata,
    p_metadata_hash, p_amount_raw, p_created_chain_at, p_due_chain_at,
    p_create_tx_hash, p_create_block_number, p_create_log_index, 'pending'
  );

  update public.wallet_nonces set consumed_at = v_now
  where wallet = p_wallet and nonce_hash = p_nonce_hash;
  return 'inserted';
end;
$$;

revoke all on function public.consume_metadata_rate_limit(text,text,text,integer,integer,integer)
  from public, anon, authenticated;
revoke all on function public.persist_invoice_metadata(
  text,text,text,bigint,text,text,text,text,text,text,text,jsonb,text,numeric,numeric,
  numeric,text,bigint,integer
) from public, anon, authenticated;
grant execute on function public.consume_metadata_rate_limit(text,text,text,integer,integer,integer)
  to service_role;
grant execute on function public.persist_invoice_metadata(
  text,text,text,bigint,text,text,text,text,text,text,text,jsonb,text,numeric,numeric,
  numeric,text,bigint,integer
) to service_role;
