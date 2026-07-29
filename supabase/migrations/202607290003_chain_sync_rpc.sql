alter table public.processed_chain_events
  add column block_hash text not null
    check (block_hash ~ '^0x[0-9a-f]{64}$'),
  add column block_timestamp numeric(20, 0) not null
    check (block_timestamp between 0 and 18446744073709551615),
  add column transaction_index integer not null
    check (transaction_index between 0 and 2147483647),
  add column merchant_wallet text not null
    check (merchant_wallet ~ '^0x[0-9a-f]{40}$'),
  add column payer_wallet text
    check (payer_wallet is null or payer_wallet ~ '^0x[0-9a-f]{40}$'),
  add column amount_raw numeric(39, 0)
    check (
      amount_raw is null
      or (amount_raw > 0 and amount_raw <= 340282366920938463463374607431768211455)
    ),
  add column due_chain_at numeric(20, 0)
    check (
      due_chain_at is null
      or due_chain_at between 0 and 18446744073709551615
    ),
  add column metadata_hash text
    check (metadata_hash is null or metadata_hash ~ '^0x[0-9a-f]{64}$'),
  add check (
    (event_name = 'InvoiceCreated'
      and payer_wallet is not null
      and amount_raw is not null
      and due_chain_at is not null
      and metadata_hash is not null)
    or
    (event_name = 'InvoicePaid'
      and payer_wallet is not null
      and amount_raw is not null
      and due_chain_at is null
      and metadata_hash is null)
    or
    (event_name = 'InvoiceCancelled'
      and payer_wallet is null
      and amount_raw is null
      and due_chain_at is null
      and metadata_hash is null)
  );

create function public.initialize_chain_sync_cursor(
  p_chain_id bigint,
  p_registry_address text,
  p_block_number bigint,
  p_block_hash text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cursor public.chain_sync_cursor%rowtype;
begin
  if p_chain_id <> 5042002
    or p_registry_address !~ '^0x[0-9a-f]{40}$'
    or p_block_number < 0
    or p_block_hash !~ '^0x[0-9a-f]{64}$'
  then
    raise exception using errcode = '22023', message = 'STFLOW_SYNC_CONFIG';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_chain_id::text || ':' || p_registry_address, 0)
  );

  select * into v_cursor
  from public.chain_sync_cursor
  where chain_id = p_chain_id
    and registry_address = p_registry_address
  for update;

  if found then
    if v_cursor.last_confirmed_block = p_block_number
      and v_cursor.last_confirmed_block_hash = p_block_hash
    then
      return 'existing';
    end if;
    raise exception using errcode = 'P0001', message = 'STFLOW_SYNC_CURSOR';
  end if;

  insert into public.chain_sync_cursor (
    chain_id, registry_address, last_confirmed_block, last_confirmed_block_hash
  ) values (
    p_chain_id, p_registry_address, p_block_number, p_block_hash
  );
  return 'initialized';
end;
$$;

create function public.apply_invoice_event_batch(
  p_chain_id bigint,
  p_registry_address text,
  p_expected_block bigint,
  p_expected_block_hash text,
  p_from_block bigint,
  p_to_block bigint,
  p_to_block_hash text,
  p_events jsonb
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cursor public.chain_sync_cursor%rowtype;
  v_item record;
  v_event jsonb;
  v_name text;
  v_invoice_id text;
  v_tx_hash text;
  v_block_hash text;
  v_merchant text;
  v_payer text;
  v_metadata_hash text;
  v_amount numeric;
  v_due_at numeric;
  v_block bigint;
  v_tx_index integer;
  v_log_index integer;
  v_timestamp numeric;
  v_previous_block bigint := -1;
  v_previous_tx integer := -1;
  v_previous_log integer := -1;
  v_inserted boolean;
  v_metadata public.invoice_metadata%rowtype;
  v_created public.processed_chain_events%rowtype;
begin
  if p_chain_id <> 5042002
    or p_registry_address !~ '^0x[0-9a-f]{40}$'
    or p_expected_block < 0
    or p_expected_block_hash !~ '^0x[0-9a-f]{64}$'
    or p_from_block <> p_expected_block + 1
    or p_to_block < p_from_block
    or p_to_block - p_from_block + 1 > 2000
    or p_to_block_hash !~ '^0x[0-9a-f]{64}$'
    or p_events is null
    or pg_catalog.jsonb_typeof(p_events) <> 'array'
  then
    raise exception using errcode = '22023', message = 'STFLOW_SYNC_RANGE';
  end if;
  if pg_catalog.jsonb_array_length(p_events) > 10000 then
    raise exception using errcode = '22023', message = 'STFLOW_SYNC_RANGE';
  end if;

  select * into v_cursor
  from public.chain_sync_cursor
  where chain_id = p_chain_id
    and registry_address = p_registry_address
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'STFLOW_SYNC_CURSOR';
  end if;

  if v_cursor.last_confirmed_block = p_to_block
    and v_cursor.last_confirmed_block_hash = p_to_block_hash
  then
    return 'idempotent';
  end if;

  if v_cursor.last_confirmed_block <> p_expected_block
    or v_cursor.last_confirmed_block_hash <> p_expected_block_hash
  then
    raise exception using errcode = 'P0001', message = 'STFLOW_SYNC_CURSOR';
  end if;

  for v_item in
    select value, ordinality
    from pg_catalog.jsonb_array_elements(p_events) with ordinality
  loop
    v_event := v_item.value;
    if pg_catalog.jsonb_typeof(v_event) <> 'object'
      or exists (
        select 1
        from pg_catalog.jsonb_object_keys(v_event) as keys(key)
        where key not in (
          'eventName', 'invoiceId', 'merchant', 'payer', 'amountRaw',
          'dueChainAt', 'metadataHash', 'txHash', 'blockHash', 'blockNumber',
          'transactionIndex', 'logIndex', 'blockTimestamp'
        )
      )
    then
      raise exception using errcode = '22023', message = 'STFLOW_EVENT_SHAPE';
    end if;

    v_name := v_event->>'eventName';
    v_invoice_id := v_event->>'invoiceId';
    v_tx_hash := v_event->>'txHash';
    v_block_hash := v_event->>'blockHash';
    v_merchant := v_event->>'merchant';
    v_payer := v_event->>'payer';
    v_metadata_hash := v_event->>'metadataHash';

    begin
      v_block := (v_event->>'blockNumber')::bigint;
      v_tx_index := (v_event->>'transactionIndex')::integer;
      v_log_index := (v_event->>'logIndex')::integer;
      v_timestamp := (v_event->>'blockTimestamp')::numeric;
      v_amount := case when v_event ? 'amountRaw'
        then (v_event->>'amountRaw')::numeric else null end;
      v_due_at := case when v_event ? 'dueChainAt'
        then (v_event->>'dueChainAt')::numeric else null end;
    exception when others then
      raise exception using errcode = '22023', message = 'STFLOW_EVENT_SHAPE';
    end;

    if v_name not in ('InvoiceCreated', 'InvoicePaid', 'InvoiceCancelled')
      or v_name is null
      or v_invoice_id is null
      or v_invoice_id !~ '^0x[0-9a-f]{64}$'
      or v_tx_hash is null
      or v_tx_hash !~ '^0x[0-9a-f]{64}$'
      or v_block_hash is null
      or v_block_hash !~ '^0x[0-9a-f]{64}$'
      or v_merchant is null
      or v_merchant !~ '^0x[0-9a-f]{40}$'
      or v_block is null
      or v_block not between p_from_block and p_to_block
      or v_tx_index is null
      or v_tx_index not between 0 and 2147483647
      or v_log_index is null
      or v_log_index not between 0 and 2147483647
      or v_timestamp is null
      or v_timestamp not between 0 and 18446744073709551615
      or (v_block = v_previous_block and (
        v_tx_index < v_previous_tx
        or (v_tx_index = v_previous_tx and v_log_index <= v_previous_log)
      ))
      or v_block < v_previous_block
    then
      raise exception using errcode = '22023', message = 'STFLOW_EVENT_SHAPE';
    end if;

    if v_name in ('InvoiceCreated', 'InvoicePaid') and (
      v_payer is null
      or v_payer !~ '^0x[0-9a-f]{40}$'
      or v_amount is null
      or v_amount <= 0
      or v_amount > 340282366920938463463374607431768211455
    ) then
      raise exception using errcode = '22023', message = 'STFLOW_EVENT_SHAPE';
    end if;
    if v_name = 'InvoiceCreated' and (
      not (v_event ? 'payer')
      or not (v_event ? 'amountRaw')
      or not (v_event ? 'dueChainAt')
      or not (v_event ? 'metadataHash')
      or v_due_at is null
      or v_due_at <= v_timestamp
      or v_due_at > 18446744073709551615
      or v_metadata_hash !~ '^0x[0-9a-f]{64}$'
    ) then
      raise exception using errcode = '22023', message = 'STFLOW_EVENT_SHAPE';
    end if;
    if v_name = 'InvoicePaid' and (
      not (v_event ? 'payer')
      or not (v_event ? 'amountRaw')
      or v_event ? 'dueChainAt'
      or v_event ? 'metadataHash'
    ) then
      raise exception using errcode = '22023', message = 'STFLOW_EVENT_SHAPE';
    end if;
    if v_name = 'InvoiceCancelled' and (
      v_event ? 'payer'
      or v_event ? 'amountRaw'
      or v_event ? 'dueChainAt'
      or v_event ? 'metadataHash'
    ) then
      raise exception using errcode = '22023', message = 'STFLOW_EVENT_SHAPE';
    end if;

    v_previous_block := v_block;
    v_previous_tx := v_tx_index;
    v_previous_log := v_log_index;

    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(p_registry_address || ':' || v_invoice_id, 0)
    );

    v_inserted := false;
    insert into public.processed_chain_events (
      chain_id, registry_address, tx_hash, log_index, block_number,
      block_hash, block_timestamp, transaction_index, invoice_id, event_name,
      merchant_wallet, payer_wallet, amount_raw, due_chain_at, metadata_hash
    ) values (
      p_chain_id, p_registry_address, v_tx_hash, v_log_index, v_block,
      v_block_hash, v_timestamp, v_tx_index, v_invoice_id, v_name,
      v_merchant, v_payer, v_amount, v_due_at, v_metadata_hash
    )
    on conflict (chain_id, registry_address, tx_hash, log_index) do nothing
    returning true into v_inserted;

    if not pg_catalog.coalesce(v_inserted, false) then
      select exists (
        select 1 from public.processed_chain_events
        where chain_id = p_chain_id
          and registry_address = p_registry_address
          and tx_hash = v_tx_hash
          and log_index = v_log_index
          and block_number = v_block
          and block_hash = v_block_hash
          and block_timestamp = v_timestamp
          and transaction_index = v_tx_index
          and invoice_id = v_invoice_id
          and event_name = v_name
          and merchant_wallet = v_merchant
          and payer_wallet is not distinct from v_payer
          and amount_raw is not distinct from v_amount
          and due_chain_at is not distinct from v_due_at
          and metadata_hash is not distinct from v_metadata_hash
      ) into v_inserted;
      if not v_inserted then
        raise exception using errcode = 'P0001', message = 'STFLOW_EVENT_CONFLICT';
      end if;
      continue;
    end if;

    if (
      v_name = 'InvoiceCreated'
      and exists (
        select 1 from public.processed_chain_events
        where chain_id = p_chain_id
          and registry_address = p_registry_address
          and invoice_id = v_invoice_id
          and event_name = 'InvoiceCreated'
          and (tx_hash, log_index) <> (v_tx_hash, v_log_index)
      )
    ) or (
      v_name in ('InvoicePaid', 'InvoiceCancelled')
      and exists (
        select 1 from public.processed_chain_events
        where chain_id = p_chain_id
          and registry_address = p_registry_address
          and invoice_id = v_invoice_id
          and event_name in ('InvoicePaid', 'InvoiceCancelled')
          and (tx_hash, log_index) <> (v_tx_hash, v_log_index)
      )
    ) then
      raise exception using errcode = 'P0001', message = 'STFLOW_EVENT_CONFLICT';
    end if;

    select * into v_metadata
    from public.invoice_metadata
    where chain_id = p_chain_id
      and registry_address = p_registry_address
      and invoice_id = v_invoice_id
    for update;

    if v_name = 'InvoiceCreated' then
      if found and (
        v_metadata.merchant_wallet <> v_merchant
        or v_metadata.payer_wallet <> v_payer
        or v_metadata.amount_raw <> v_amount
        or v_metadata.created_chain_at <> v_timestamp
        or v_metadata.due_chain_at <> v_due_at
        or v_metadata.metadata_hash <> v_metadata_hash
        or v_metadata.create_tx_hash <> v_tx_hash
        or v_metadata.create_block_number <> v_block
        or v_metadata.create_log_index <> v_log_index
      ) then
        raise exception using errcode = 'P0001', message = 'STFLOW_EVENT_CONFLICT';
      end if;
      continue;
    end if;

    select * into v_created
    from public.processed_chain_events
    where chain_id = p_chain_id
      and registry_address = p_registry_address
      and invoice_id = v_invoice_id
      and event_name = 'InvoiceCreated'
    order by block_number, transaction_index, log_index
    limit 1;

    if not found
      or v_created.merchant_wallet <> v_merchant
      or (v_name = 'InvoicePaid' and (
        v_created.payer_wallet <> v_payer
        or v_created.amount_raw <> v_amount
      ))
    then
      raise exception using errcode = 'P0001', message = 'STFLOW_EVENT_CONFLICT';
    end if;

    if v_metadata.invoice_id is null then
      continue;
    end if;
    if v_metadata.indexed_status <> 'pending'
      or v_metadata.merchant_wallet <> v_created.merchant_wallet
      or v_metadata.payer_wallet <> v_created.payer_wallet
      or v_metadata.amount_raw <> v_created.amount_raw
    then
      raise exception using errcode = 'P0001', message = 'STFLOW_EVENT_CONFLICT';
    end if;

    if v_name = 'InvoicePaid' then
      update public.invoice_metadata set
        indexed_status = 'paid',
        paid_chain_at = v_timestamp,
        payment_tx_hash = v_tx_hash,
        payment_block_number = v_block,
        payment_log_index = v_log_index
      where chain_id = p_chain_id
        and registry_address = p_registry_address
        and invoice_id = v_invoice_id;
    else
      update public.invoice_metadata set
        indexed_status = 'cancelled',
        cancelled_chain_at = v_timestamp,
        cancellation_tx_hash = v_tx_hash,
        cancellation_block_number = v_block,
        cancellation_log_index = v_log_index
      where chain_id = p_chain_id
        and registry_address = p_registry_address
        and invoice_id = v_invoice_id;
    end if;
  end loop;

  update public.chain_sync_cursor set
    last_confirmed_block = p_to_block,
    last_confirmed_block_hash = p_to_block_hash
  where chain_id = p_chain_id
    and registry_address = p_registry_address;
  return 'applied';
end;
$$;

create or replace function public.persist_invoice_metadata(
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
  v_created public.processed_chain_events%rowtype;
  v_terminal public.processed_chain_events%rowtype;
  v_status text := 'pending';
begin
  if p_wallet <> p_merchant_wallet then
    raise exception using errcode = 'P0001', message = 'STFLOW_NONCE_INVALID';
  end if;

  select * into v_nonce from public.wallet_nonces
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

  select * into v_row from public.invoice_metadata
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
      select * into v_created from public.processed_chain_events
      where chain_id = p_chain_id
        and registry_address = p_registry_address
        and invoice_id = p_invoice_id
        and event_name = 'InvoiceCreated'
      order by block_number, transaction_index, log_index
      limit 1;

      select * into v_terminal from public.processed_chain_events
      where chain_id = p_chain_id
        and registry_address = p_registry_address
        and invoice_id = p_invoice_id
        and event_name in ('InvoicePaid', 'InvoiceCancelled')
      order by block_number desc, transaction_index desc, log_index desc
      limit 1;

      if found then
        if v_created.invoice_id is null
          or v_created.merchant_wallet <> p_merchant_wallet
          or v_created.payer_wallet <> p_payer_wallet
          or v_created.amount_raw <> p_amount_raw
          or v_terminal.merchant_wallet <> p_merchant_wallet
          or (v_terminal.event_name = 'InvoicePaid' and (
            v_terminal.payer_wallet <> p_payer_wallet
            or v_terminal.amount_raw <> p_amount_raw
          ))
        then
          raise exception using errcode = 'P0001', message = 'STFLOW_METADATA_CONFLICT';
        end if;

        if v_row.indexed_status = 'pending' then
          if v_terminal.event_name = 'InvoicePaid' then
            update public.invoice_metadata set
              indexed_status = 'paid',
              paid_chain_at = v_terminal.block_timestamp,
              payment_tx_hash = v_terminal.tx_hash,
              payment_block_number = v_terminal.block_number,
              payment_log_index = v_terminal.log_index
            where chain_id = p_chain_id
              and registry_address = p_registry_address
              and invoice_id = p_invoice_id;
          else
            update public.invoice_metadata set
              indexed_status = 'cancelled',
              cancelled_chain_at = v_terminal.block_timestamp,
              cancellation_tx_hash = v_terminal.tx_hash,
              cancellation_block_number = v_terminal.block_number,
              cancellation_log_index = v_terminal.log_index
            where chain_id = p_chain_id
              and registry_address = p_registry_address
              and invoice_id = p_invoice_id;
          end if;
        elsif (
          v_terminal.event_name = 'InvoicePaid'
          and (
            v_row.indexed_status <> 'paid'
            or v_row.payment_tx_hash <> v_terminal.tx_hash
            or v_row.payment_block_number <> v_terminal.block_number
            or v_row.payment_log_index <> v_terminal.log_index
            or v_row.paid_chain_at <> v_terminal.block_timestamp
          )
        ) or (
          v_terminal.event_name = 'InvoiceCancelled'
          and (
            v_row.indexed_status <> 'cancelled'
            or v_row.cancellation_tx_hash <> v_terminal.tx_hash
            or v_row.cancellation_block_number <> v_terminal.block_number
            or v_row.cancellation_log_index <> v_terminal.log_index
            or v_row.cancelled_chain_at <> v_terminal.block_timestamp
          )
        ) then
          raise exception using errcode = 'P0001', message = 'STFLOW_METADATA_CONFLICT';
        end if;
      elsif v_row.indexed_status <> 'pending' then
        raise exception using errcode = 'P0001', message = 'STFLOW_METADATA_CONFLICT';
      end if;

      update public.wallet_nonces set consumed_at = v_now
      where wallet = p_wallet and nonce_hash = p_nonce_hash;
      return 'idempotent';
    end if;
    raise exception using errcode = 'P0001', message = 'STFLOW_METADATA_CONFLICT';
  end if;

  select * into v_created from public.processed_chain_events
  where chain_id = p_chain_id
    and registry_address = p_registry_address
    and invoice_id = p_invoice_id
    and event_name = 'InvoiceCreated'
  order by block_number, transaction_index, log_index
  limit 1;
  if found and (
    v_created.merchant_wallet <> p_merchant_wallet
    or v_created.payer_wallet <> p_payer_wallet
    or v_created.amount_raw <> p_amount_raw
    or v_created.block_timestamp <> p_created_chain_at
    or v_created.due_chain_at <> p_due_chain_at
    or v_created.metadata_hash <> p_metadata_hash
    or v_created.tx_hash <> p_create_tx_hash
    or v_created.block_number <> p_create_block_number
    or v_created.log_index <> p_create_log_index
  ) then
    raise exception using errcode = 'P0001', message = 'STFLOW_METADATA_CONFLICT';
  end if;

  select * into v_terminal from public.processed_chain_events
  where chain_id = p_chain_id
    and registry_address = p_registry_address
    and invoice_id = p_invoice_id
    and event_name in ('InvoicePaid', 'InvoiceCancelled')
  order by block_number desc, transaction_index desc, log_index desc
  limit 1;
  if found then
    if v_created.invoice_id is null
      or v_terminal.merchant_wallet <> p_merchant_wallet
      or v_created.payer_wallet <> p_payer_wallet
      or v_created.amount_raw <> p_amount_raw
      or (v_terminal.event_name = 'InvoicePaid' and (
        v_terminal.payer_wallet <> p_payer_wallet
        or v_terminal.amount_raw <> p_amount_raw
      ))
    then
      raise exception using errcode = 'P0001', message = 'STFLOW_METADATA_CONFLICT';
    end if;
    v_status := case v_terminal.event_name
      when 'InvoicePaid' then 'paid' else 'cancelled' end;
  end if;

  insert into public.invoice_metadata (
    invoice_id, chain_id, registry_address, merchant_wallet, payer_wallet,
    customer_name, title, description, memo, canonical_metadata, metadata_hash,
    amount_raw, created_chain_at, due_chain_at, create_tx_hash,
    create_block_number, create_log_index, indexed_status,
    paid_chain_at, payment_tx_hash, payment_block_number, payment_log_index,
    cancelled_chain_at, cancellation_tx_hash, cancellation_block_number,
    cancellation_log_index
  ) values (
    p_invoice_id, p_chain_id, p_registry_address, p_merchant_wallet,
    p_payer_wallet, p_customer_name, p_title, p_description, p_memo,
    p_canonical_metadata, p_metadata_hash, p_amount_raw, p_created_chain_at,
    p_due_chain_at, p_create_tx_hash, p_create_block_number, p_create_log_index,
    v_status,
    case when v_status = 'paid' then v_terminal.block_timestamp end,
    case when v_status = 'paid' then v_terminal.tx_hash end,
    case when v_status = 'paid' then v_terminal.block_number end,
    case when v_status = 'paid' then v_terminal.log_index end,
    case when v_status = 'cancelled' then v_terminal.block_timestamp end,
    case when v_status = 'cancelled' then v_terminal.tx_hash end,
    case when v_status = 'cancelled' then v_terminal.block_number end,
    case when v_status = 'cancelled' then v_terminal.log_index end
  );

  update public.wallet_nonces set consumed_at = v_now
  where wallet = p_wallet and nonce_hash = p_nonce_hash;
  return 'inserted';
end;
$$;

revoke all on function public.initialize_chain_sync_cursor(bigint,text,bigint,text)
  from public, anon, authenticated;
revoke all on function public.apply_invoice_event_batch(
  bigint,text,bigint,text,bigint,bigint,text,jsonb
) from public, anon, authenticated;
revoke all on function public.persist_invoice_metadata(
  text,text,text,bigint,text,text,text,text,text,text,text,jsonb,text,numeric,numeric,
  numeric,text,bigint,integer
) from public, anon, authenticated;
grant execute on function public.initialize_chain_sync_cursor(bigint,text,bigint,text)
  to service_role;
grant execute on function public.apply_invoice_event_batch(
  bigint,text,bigint,text,bigint,bigint,text,jsonb
) to service_role;
grant execute on function public.persist_invoice_metadata(
  text,text,text,bigint,text,text,text,text,text,text,text,jsonb,text,numeric,numeric,
  numeric,text,bigint,integer
) to service_role;
