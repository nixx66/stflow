import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("dashboard gates authoritative totals behind a successful chain read", () => {
  const page = readFileSync("app/dashboard/page.tsx", "utf8");
  assert.match(page, /status === "disconnected"/);
  assert.match(page, /status === "loading"/);
  assert.match(page, /status === "error"/);
  assert.match(page, /status === "partial"/);
  assert.match(page, /\{isReady \? <>/);
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
