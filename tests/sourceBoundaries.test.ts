import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("public routes and storage identifiers stay stable", () => {
  const nav = readFileSync("components/Navbar.tsx", "utf8");
  const invoice = readFileSync("lib/invoice.ts", "utf8");
  const api = readFileSync("app/api/invoices/route.ts", "utf8");

  assert.match(nav, /href:\s*"\/dashboard"/);
  assert.match(nav, /href:\s*"\/console\/invoices"/);
  assert.match(invoice, /stflow\.invoices\.v1/);
  assert.match(api, /Invalid invoice payload/);
});
