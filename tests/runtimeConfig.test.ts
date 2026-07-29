import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ARC_CONTRACTS,
  ARC_TESTNET
} from "../lib/arc.ts";
import {
  getServerRuntimeConfig,
  RuntimeConfigError
} from "../lib/server/runtimeConfig.ts";

const validEnv = {
  SUPABASE_URL: "https://project-ref.supabase.co/",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_1234567890abcdefghijklmnopqrstuvwxyz",
  NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS:
    "0x1111111111111111111111111111111111111111"
};

test("reports every missing server variable without exposing values", () => {
  assert.throws(
    () => getServerRuntimeConfig({}),
    (error: unknown) => {
      assert.ok(error instanceof RuntimeConfigError);
      assert.deepEqual(error.variables, [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS"
      ]);
      assert.doesNotMatch(error.message, /undefined|null/);
      return true;
    }
  );
});

test("rejects unsafe Supabase URLs and malformed credentials", () => {
  const secret = "short";

  assert.throws(
    () =>
      getServerRuntimeConfig({
        ...validEnv,
        SUPABASE_URL: "http://localhost:54321?key=leak",
        SUPABASE_SERVICE_ROLE_KEY: secret,
        NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS: "0x123"
      }),
    (error: unknown) => {
      assert.ok(error instanceof RuntimeConfigError);
      assert.deepEqual(error.variables, [
        "SUPABASE_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS"
      ]);
      assert.doesNotMatch(error.message, new RegExp(secret));
      assert.doesNotMatch(error.message, /localhost|0x123/);
      return true;
    }
  );
});

test("rejects private hosts, endpoint paths, and implausible service keys", () => {
  for (const [url, key, variable] of [
    [
      "https://10.0.0.1",
      validEnv.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_URL"
    ],
    [
      "https://project-ref.supabase.co/rest/v1",
      validEnv.SUPABASE_SERVICE_ROLE_KEY,
      "SUPABASE_URL"
    ],
    [
      validEnv.SUPABASE_URL,
      "abcdefghijklmnopqrstuvwxyz123456",
      "SUPABASE_SERVICE_ROLE_KEY"
    ]
  ] as const) {
    assert.throws(
      () =>
        getServerRuntimeConfig({
          ...validEnv,
          SUPABASE_URL: url,
          SUPABASE_SERVICE_ROLE_KEY: key
        }),
      (error: unknown) => {
        assert.ok(error instanceof RuntimeConfigError);
        assert.deepEqual(error.variables, [variable]);
        return true;
      }
    );
  }
});

test("accepts secure Supabase project and custom-domain URLs", () => {
  for (const url of [
    "https://project-ref.supabase.co",
    "https://supabase.example.com"
  ]) {
    assert.equal(getServerRuntimeConfig({ ...validEnv, SUPABASE_URL: url }).supabaseUrl, url);
  }
});

test("normalizes and freezes server runtime configuration", () => {
  const config = getServerRuntimeConfig({
    ...validEnv,
    SUPABASE_URL: "  https://project-ref.supabase.co/  ",
    SUPABASE_SERVICE_ROLE_KEY: `  ${validEnv.SUPABASE_SERVICE_ROLE_KEY}  `,
    NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS:
      "  0x1111111111111111111111111111111111111111  "
  });

  assert.equal(config.supabaseUrl, "https://project-ref.supabase.co");
  assert.equal(config.supabaseServiceRoleKey, validEnv.SUPABASE_SERVICE_ROLE_KEY);
  assert.equal(
    config.invoiceRegistryAddress,
    "0x1111111111111111111111111111111111111111"
  );
  assert.equal(Object.isFrozen(config), true);
});

test("ignores environment attempts to override fixed Arc configuration", () => {
  const config = getServerRuntimeConfig({
    ...validEnv,
    ARC_CHAIN_ID: "1",
    ARC_RPC_URL: "https://evil.example",
    USDC_ADDRESS: "0x2222222222222222222222222222222222222222",
    ARC_EXPLORER_URL: "https://evil.example"
  });

  assert.equal(config.chainId, ARC_TESTNET.chainId);
  assert.equal(config.rpcUrl, ARC_TESTNET.rpcUrl);
  assert.equal(config.explorerUrl, ARC_TESTNET.explorerUrl);
  assert.equal(config.usdcAddress, ARC_CONTRACTS.usdc);
});

test("keeps Supabase credentials server-only and client creation lazy", async () => {
  const [env, admin, legacyClient] = await Promise.all([
    readFile(".env.example", "utf8"),
    readFile("lib/server/supabase.ts", "utf8"),
    readFile("lib/supabase.ts", "utf8").catch(() => "")
  ]);

  assert.doesNotMatch(env, /NEXT_PUBLIC_SUPABASE_/);
  assert.match(env, /^SUPABASE_URL=/m);
  assert.match(env, /^SUPABASE_SERVICE_ROLE_KEY=/m);
  assert.doesNotMatch(legacyClient, /NEXT_PUBLIC_SUPABASE_/);
  assert.match(admin, /export function getSupabaseAdmin/);
  assert.ok(admin.indexOf("createClient(") > admin.indexOf("export function getSupabaseAdmin"));
  assert.match(admin, /persistSession:\s*false/);
  assert.match(admin, /autoRefreshToken:\s*false/);
  assert.match(admin, /detectSessionInUrl:\s*false/);
});
