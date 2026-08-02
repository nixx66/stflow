import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  ARC_CONTRACTS,
  ARC_TESTNET
} from "../lib/arc.ts";
import {
  parseServerRuntimeConfig,
  RuntimeConfigError
} from "../lib/server/internal/runtimeConfig.ts";

const validEnv = {
  SUPABASE_URL: "https://project-ref.supabase.co/",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_1234567890abcdefghijklmnopqrstuvwxyz",
  NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS:
    "0x1111111111111111111111111111111111111111"
};
const getServerRuntimeConfig = parseServerRuntimeConfig;

function jwt(role: string) {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ role })}.signature`;
}

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
    assert.equal(
      getServerRuntimeConfig({ ...validEnv, SUPABASE_URL: url }).supabaseUrl,
      url
    );
  }
});

test("accepts only service-role legacy JWT credentials", () => {
  assert.doesNotThrow(() =>
    getServerRuntimeConfig({
      ...validEnv,
      SUPABASE_SERVICE_ROLE_KEY: jwt("service_role")
    })
  );

  for (const key of [jwt("anon"), "eyJ.invalid.signature"]) {
    assert.throws(
      () =>
        getServerRuntimeConfig({
          ...validEnv,
          SUPABASE_SERVICE_ROLE_KEY: key
        }),
      (error: unknown) => {
        assert.ok(error instanceof RuntimeConfigError);
        assert.deepEqual(error.variables, ["SUPABASE_SERVICE_ROLE_KEY"]);
        assert.doesNotMatch(error.message, /anon|invalid|signature/);
        return true;
      }
    );
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

test("uses a normalized private Arc RPC endpoint before the public fallback", () => {
  const config = getServerRuntimeConfig({
    ...validEnv,
    ARC_RPC_URL: " https://arc-testnet.g.alchemy.com/v2/test-key "
  });

  assert.deepEqual(config.rpcUrls, [
    "https://arc-testnet.g.alchemy.com/v2/test-key",
    ARC_TESTNET.rpcUrl
  ]);
  assert.equal(config.rpcUrl, "https://arc-testnet.g.alchemy.com/v2/test-key");
  assert.equal(Object.isFrozen(config.rpcUrls), true);
});

test("uses the public Arc RPC endpoint when no private endpoint is configured", () => {
  const config = getServerRuntimeConfig(validEnv);

  assert.deepEqual(config.rpcUrls, [ARC_TESTNET.rpcUrl]);
  assert.equal(config.rpcUrl, ARC_TESTNET.rpcUrl);
});

test("rejects unsafe private Arc RPC endpoints without exposing them", () => {
  for (const url of [
    "http://arc-testnet.g.alchemy.com/v2/test-key",
    "https://user:password@arc-testnet.g.alchemy.com/v2/test-key",
    "https://arc-testnet.g.alchemy.com/v2/test-key?secret=value",
    "https://arc-testnet.g.alchemy.com/v2/test-key#secret",
    "https://arc-testnet.g.alchemy.com:443/v2/test-key",
    "https://arc-testnet.g.alchemy.com:443\\v2/test-key",
    "https:\\arc-testnet.g.alchemy.com:443\\v2\\test-key",
    "https:\\\\arc-testnet.g.alchemy.com:443\\v2\\test-key",
    "https:/\\arc-testnet.g.alchemy.com:443/v2/test-key",
    "https://arc-testnet.g.alchemy.com:443\t/v2/test-key",
    "https://arc-testnet.g.alchemy.com:443\n/v2/test-key",
    "https://arc-testnet.g.alchemy.com:443\r/v2/test-key",
    "https://arc-testnet.g.alchemy.com:\t443/v2/test-key",
    "https://arc-testnet.g.alchemy.com/v2/test\t-key",
    "https://localhost/v2/test-key",
    "https://127.0.0.1/v2/test-key",
    "https://arc-testnet.g.alchemy.com/v3/test-key",
    "https://rpc.testnet.arc.network/v2/test-key"
  ]) {
    assert.throws(
      () => getServerRuntimeConfig({ ...validEnv, ARC_RPC_URL: url }),
      (error: unknown) => {
        assert.ok(error instanceof RuntimeConfigError);
        assert.ok(error.variables.includes("ARC_RPC_URL"));
        assert.equal(error.message.includes(url), false);
        assert.equal(error.message.includes("test-key"), false);
        return true;
      }
    );
  }
});

test("ignores environment attempts to override fixed Arc configuration", () => {
  const config = getServerRuntimeConfig({
    ...validEnv,
    ARC_CHAIN_ID: "1",
    USDC_ADDRESS: "0x2222222222222222222222222222222222222222",
    ARC_EXPLORER_URL: "https://evil.example"
  });

  assert.equal(config.chainId, ARC_TESTNET.chainId);
  assert.equal(config.rpcUrl, ARC_TESTNET.rpcUrl);
  assert.equal(config.explorerUrl, ARC_TESTNET.explorerUrl);
  assert.equal(config.usdcAddress, ARC_CONTRACTS.usdc);
});

test("keeps Supabase credentials server-only and client creation lazy", async () => {
  const [env, admin, guardedConfig, legacyClient, createHook] =
    await Promise.all([
      readFile(".env.example", "utf8"),
      readFile("lib/server/supabase.ts", "utf8"),
      readFile("lib/server/runtimeConfig.ts", "utf8"),
      readFile("lib/supabase.ts", "utf8").catch(() => ""),
      readFile("hooks/useCreateInvoice.ts", "utf8")
    ]);

  assert.doesNotMatch(env, /NEXT_PUBLIC_SUPABASE_/);
  assert.match(env, /^SUPABASE_URL=/m);
  assert.match(env, /^SUPABASE_SERVICE_ROLE_KEY=/m);
  assert.match(
    env,
    /^# Server-only private Arc Testnet endpoint\. Never use NEXT_PUBLIC_ or commit a real key\.$/m
  );
  assert.match(env, /^ARC_RPC_URL=$/m);
  assert.doesNotMatch(env, /NEXT_PUBLIC_ARC_RPC_URL/);
  assert.doesNotMatch(legacyClient, /NEXT_PUBLIC_SUPABASE_/);
  assert.match(admin, /export function getSupabaseAdmin/);
  assert.match(admin, /^import "server-only";/m);
  assert.match(guardedConfig, /^import "server-only";/m);
  assert.ok(
    admin.indexOf("createClient(") >
      admin.indexOf("export function getSupabaseAdmin")
  );
  assert.match(admin, /persistSession:\s*false/);
  assert.match(admin, /autoRefreshToken:\s*false/);
  assert.match(admin, /detectSessionInUrl:\s*false/);
  assert.doesNotMatch(createHook, /NEXT_PUBLIC_SUPABASE_/);
  assert.match(createHook, /\/api\/v1\/invoices\/metadata/);
  assert.match(createHook, /metadataPending = true/);
});

test("server guards reject client imports without reading configuration", () => {
  const guarded = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      "await import('./lib/server/runtimeConfig.ts')"
    ],
    { cwd: process.cwd(), encoding: "utf8" }
  );

  assert.notEqual(guarded.status, 0);
  assert.match(
    guarded.stderr,
    /cannot be imported from a Client Component module/i
  );
  assert.doesNotMatch(
    guarded.stderr,
    /SUPABASE_SERVICE_ROLE_KEY|NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS/
  );
});

test("server modules import lazily and cache the admin client", () => {
  const script = `
    const runtime = await import('./lib/server/runtimeConfig.ts');
    await import('./lib/server/supabase.ts');
    try {
      runtime.getServerRuntimeConfig({});
      process.exit(2);
    } catch (error) {
      if (error.name !== 'RuntimeConfigError') process.exit(3);
    }
    process.env.SUPABASE_URL = 'https://project-ref.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'sb_secret_1234567890abcdefghijklmnopqrstuvwxyz';
    process.env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS = '0x1111111111111111111111111111111111111111';
    const { getSupabaseAdmin } = await import('./lib/server/supabase.ts');
    if (getSupabaseAdmin() !== getSupabaseAdmin()) process.exit(4);
  `;
  const guarded = spawnSync(
    process.execPath,
    ["--conditions=react-server", "--input-type=module", "--eval", script],
    { cwd: process.cwd(), encoding: "utf8" }
  );

  assert.equal(guarded.status, 0, guarded.stderr);
  assert.equal(guarded.stdout, "");
});
