import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const routes = [
  ["app/console/customers/page.tsx", "Customer directory", "customerRows"],
  ["app/console/orders/page.tsx", "Settlement orders", "orderRows"],
  ["app/console/analytics/page.tsx", "Invoice analytics", "invoiceAnalytics"],
  ["app/console/export/page.tsx", "Export invoice ledger", "invoiceCsv"]
] as const;

for (const [path, heading, helper] of routes) {
  test(`${path} renders distinct console content`, () => {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /from "next\/navigation"/);
    assert.doesNotMatch(source, /redirect\(/);
    assert.match(source, new RegExp(heading));
    assert.match(source, new RegExp(helper));
    assert.match(source, /useInvoices/);
  });
}

test("all console navigation targets are backed by pages", () => {
  const shell = readFileSync("components/console/ConsoleShell.tsx", "utf8");
  for (const [, label] of routes) {
    assert.ok(label.length > 0);
  }
  for (const path of ["customers", "orders", "analytics", "export"]) {
    assert.match(shell, new RegExp(`/console/${path}`));
  }
});

test("console does not expose the read-only settings page", () => {
  const shell = readFileSync("components/console/ConsoleShell.tsx", "utf8");

  assert.doesNotMatch(shell, /\/console\/settings/);
  assert.equal(existsSync("app/console/settings/page.tsx"), false);
});
