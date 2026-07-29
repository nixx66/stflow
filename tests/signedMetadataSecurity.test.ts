import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { readBoundedJson } from "../lib/server/internal/readBoundedJson.ts";

test("security migration persists metadata and consumes nonce in one function", async () => {
  const sql = await readFile(
    "supabase/migrations/202607290002_signed_metadata_rpc.sql",
    "utf8"
  );
  assert.match(sql, /create function public\.persist_invoice_metadata/i);
  assert.match(sql, /security definer/i);
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /for update/i);
  assert.match(sql, /pg_catalog\.pg_advisory_xact_lock/i);
  assert.match(sql, /p_registry_address \|\| ':' \|\| p_invoice_id/i);
  assert.match(sql, /canonical_metadata is not distinct from p_canonical_metadata/i);
  assert.match(sql, /created_chain_at = p_created_chain_at/i);
  assert.match(sql, /update public\.wallet_nonces[\s\S]*consumed_at = v_now/i);
  assert.match(sql, /grant execute[\s\S]*to service_role/i);
  assert.match(sql, /revoke all[\s\S]*from public, anon, authenticated/i);
});

test("security migration installs a private durable rate limiter and cleanup", async () => {
  const sql = await readFile(
    "supabase/migrations/202607290002_signed_metadata_rpc.sql",
    "utf8"
  );
  assert.match(sql, /create table public\.metadata_rate_limits/i);
  assert.match(sql, /bucket_kind text not null/i);
  assert.match(sql, /bucket_key text not null/i);
  assert.match(sql, /force row level security/i);
  assert.match(sql, /create function public\.consume_metadata_rate_limit/i);
  assert.match(sql, /delete from public\.metadata_rate_limits/i);
  assert.match(sql, /delete from public\.wallet_nonces/i);
  assert.match(sql, /metadata_rate_limits_expiry_idx/i);
  assert.match(sql, /v_client_count <= p_client_limit[\s\S]*v_wallet_count <= p_wallet_limit/i);
});

test("dual rate buckets stop wallet and client rotation independently", () => {
  const counts = new Map<string, number>();
  const take = (wallet: string, client: string, walletLimit = 2, clientLimit = 3) => {
    const keys = [`wallet:${wallet}`, `client:${client}`];
    const next = keys.map((key) => (counts.get(key) ?? 0) + 1);
    keys.forEach((key, index) => counts.set(key, next[index]));
    return next[0] <= walletLimit && next[1] <= clientLimit;
  };
  assert.equal(take("a", "ip"), true);
  assert.equal(take("b", "ip"), true);
  assert.equal(take("c", "ip"), true);
  assert.equal(take("d", "ip"), false);
  assert.equal(take("same", "ip1"), true);
  assert.equal(take("same", "ip2"), true);
  assert.equal(take("same", "ip3"), false);
});

test("invoice advisory serialization makes distinct nonces converge idempotently", async () => {
  let row: string | undefined;
  let tail = Promise.resolve();
  const persist = (value: string) => {
    const run = tail.then(() => {
      if (!row) {
        row = value;
        return "inserted";
      }
      return row === value ? "idempotent" : "conflict";
    });
    tail = run.then(() => undefined);
    return run;
  };
  assert.deepEqual(await Promise.all([persist("same"), persist("same")]), [
    "inserted",
    "idempotent"
  ]);
});

test("server repository uses only the atomic persistence RPC", async () => {
  const source = await readFile("lib/server/invoiceMetadataRepository.ts", "utf8");
  assert.match(source, /\.rpc\("persist_invoice_metadata"/);
  assert.doesNotMatch(source, /wallet_nonces[\s\S]*\.update|invoice_metadata[\s\S]*\.insert/);
  assert.match(source, /STFLOW_NONCE_INVALID/);
  assert.match(source, /STFLOW_METADATA_CONFLICT/);
});

test("bounded reader rejects a chunked body once it crosses the limit", async () => {
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode('{"x":"'));
      controller.enqueue(new Uint8Array(100));
      controller.enqueue(new TextEncoder().encode('"}'));
      controller.close();
    }
  });
  await assert.rejects(
    readBoundedJson(new Request("https://example.test", { method: "POST", body, duplex: "half" } as RequestInit), 64),
    /too large/i
  );
});

test("bounded reader returns validation errors for null and malformed JSON", async () => {
  await assert.rejects(
    readBoundedJson(new Request("https://example.test", { method: "POST", body: "null" }), 100),
    /object/i
  );
  await assert.rejects(
    readBoundedJson(new Request("https://example.test", { method: "POST", body: "{" }), 100),
    /json/i
  );
});
