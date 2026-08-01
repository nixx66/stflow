import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("dashboard gates authoritative totals behind a successful chain read", () => {
  const page = readFileSync("app/dashboard/page.tsx", "utf8");
  assert.match(page, /status === "disconnected"/);
  assert.match(page, /status === "loading"/);
  assert.match(page, /status === "error"/);
  assert.match(page, /status === "partial"/);
  const readyStart = page.indexOf("{isReady ? <>");
  const transactions = page.indexOf("<TransactionTable");
  const readyEnd = page.indexOf("</> : null}", readyStart);
  assert.ok(readyStart >= 0);
  assert.ok(transactions > readyStart);
  assert.ok(readyEnd > transactions);
  assert.equal(page.slice(readyEnd).includes("<TransactionTable"), false);
  assert.match(page, /aria-live=/);
  assert.match(page, /role="alert"/);
});

test("console pages return a state surface before rendering zero metrics", () => {
  for (const path of ["app/console/page.tsx", "app/console/invoices/page.tsx"]) {
    const page = readFileSync(path, "utf8");
    assert.match(page, /status !== "ready" && status !== "partial"/);
    assert.match(page, /role=\{status === "error" \? "alert" : "status"\}/);
  }
});

test("browser invoice loading uses the internal wallet API and hides raw RPC errors", () => {
  const hook = readFileSync("hooks/useInvoice.ts", "utf8");
  assert.match(hook, /\/api\/v1\/invoices\/wallet\//);
  assert.doesNotMatch(hook, /client\.readContract/);
  assert.doesNotMatch(hook, /cause\.message/);
  assert.match(hook, /Arc Testnet data is temporarily unavailable\. Please try again\./);
});

test("registry config normalizes legacy mixed-case deployment values", () => {
  const source = readFileSync("lib/contracts/invoiceRegistry.ts", "utf8");
  assert.match(source, /getAddress\(value\.toLowerCase\(\)\)/);
  assert.doesNotMatch(source, /strict:\s*true/);
});
