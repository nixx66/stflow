import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("public routes and canonical chain identifiers stay stable", () => {
  const nav = readFileSync("components/Navbar.tsx", "utf8");
  const links = readFileSync("lib/sharedInvoiceLink.ts", "utf8");

  assert.match(nav, /href:\s*"\/dashboard"/);
  assert.match(nav, /href:\s*"\/console\/invoices"/);
  assert.match(links, /`\/pay\/\$\{invoice\.id\}`/);
  assert.equal(existsSync("app/api/invoices/route.ts"), false);
});
