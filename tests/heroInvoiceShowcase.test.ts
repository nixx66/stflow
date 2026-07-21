import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";

test("homepage uses the tall mint invoice showcase", () => {
  const source = readFileSync("components/home/HeroSection.tsx", "utf8");

  assert.match(source, /sf-invoice-showcase/);
  assert.match(source, /stflow-invoice-flow-mint\.webp/);
  assert.match(source, /sf-invoice-glass/);
  assert.equal(existsSync("public/stflow-invoice-flow-mint.webp"), true);
});
