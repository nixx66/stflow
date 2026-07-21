import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

test("top navigation Dashboard link opens the dashboard page", () => {
  const source = readFileSync("components/Navbar.tsx", "utf8");

  assert.match(source, /label:\s*"Dashboard",[\s\S]*?href:\s*"\/dashboard"/);
  assert.doesNotMatch(source, /label:\s*"Dashboard",[\s\S]*?href:\s*"\/#dashboard"/);
});
