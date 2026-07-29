import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const roots = ["app", "components", "hooks", "lib"];
const configFiles = [".env.example", "package.json", "next.config.mjs", "vercel.json"];
const ignored = [join("lib", "openzeppelin-contracts")];
const bannedFiles = [
  "lib/mockData.ts",
  "lib/v2MockData.ts",
  "lib/serverInvoiceStore.ts",
  "lib/paymentMode.ts",
  "lib/invoiceServerClient.ts",
  "app/api/invoices/route.ts",
  "app/api/invoices/[invoiceId]/route.ts"
];
const banned = [
  /from\s+["'][^"']*(?:mockData|v2MockData|serverInvoiceStore|paymentMode|invoiceServerClient)["']/,
  /\blocalStorage\b/,
  /\bcreateMock(?:Invoice|TxHash)\b/,
  /\/api\/invoices(?:\/|["'`])/,
  /NEXT_PUBLIC_STFLOW_PAYMENT_MODE/,
  /\bMOCK_MERCHANT_[A-Z]+\b/,
  /\b(?:writeFile|appendFile|createWriteStream)\s*\(/,
  /\bcreateMockTxHash\b/,
  /crypto\.getRandomValues[\s\S]{0,160}(?:tx|transaction).{0,20}hash/i,
  /functionName:\s*["']transfer["']/,
  /from\s+["'][^"']*(?:tests|fixtures)\//
];

function files(root: string): string[] {
  if (!existsSync(root)) return [];
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    if (ignored.some((entry) => path === entry || path.startsWith(`${entry}\\`))) return [];
    return statSync(path).isDirectory() ? files(path) : /\.(?:ts|tsx|js|jsx|mjs|cjs|json|yml|yaml)$/.test(path) ? [path] : [];
  });
}

test("production source has no operational mock, local ledger, or legacy invoice API", () => {
  assert.deepEqual(bannedFiles.filter(existsSync), []);

  const violations = [...roots.flatMap(files), ...configFiles.filter(existsSync)].flatMap((path) => {
    const source = readFileSync(path, "utf8");
    return banned.filter((pattern) => pattern.test(source)).map((pattern) => {
      return `${relative(".", path)}: ${pattern}`;
    });
  });

  assert.deepEqual(violations, []);
});

test("operational surfaces contain no demo, seed, or generated-ledger language", () => {
  const paths = [
    ...files("hooks"),
    ...files("lib").filter((path) => !path.includes("openzeppelin-contracts")),
    ...files(join("app", "dashboard")),
    ...files(join("app", "console")),
    ...files(join("app", "pay")),
    ...files(join("app", "receipt")),
    ...files(join("components", "wallet")),
    ...files(join("components", "console"))
  ];
  const violations = paths.filter((path) =>
    /\b(?:demo|seeded?|mock|generated transaction hash)\b/i.test(readFileSync(path, "utf8"))
  );
  assert.deepEqual(violations, []);
});

test("public invoice routes remain stable", () => {
  const nav = readFileSync("components/Navbar.tsx", "utf8");
  assert.match(nav, /href:\s*"\/dashboard"/);
  assert.match(nav, /href:\s*"\/console\/invoices"/);
  assert.ok(existsSync("app/pay/[invoiceId]/page.tsx"));
  assert.ok(existsSync("app/receipt/[invoiceId]/page.tsx"));
  assert.ok(existsSync("app/api/v1/invoices/[invoiceId]/route.ts"));
});
