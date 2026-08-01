import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("service role can read metadata and chain sync state", async () => {
  const sql = await readFile(
    "supabase/migrations/202608010001_service_role_read_access.sql",
    "utf8"
  );

  assert.match(
    sql,
    /grant select on table public\.invoice_metadata to service_role;/i
  );
  assert.match(
    sql,
    /grant select on table public\.chain_sync_cursor to service_role;/i
  );
  assert.doesNotMatch(sql, /\bto\s+(?:anon|authenticated|public)\b/i);
});
