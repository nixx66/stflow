import assert from "node:assert/strict";
import { globSync, readFileSync } from "node:fs";
import test from "node:test";

test("homepage marketing sections use the unified mint palette", () => {
  const files = ["app/page.tsx", ...globSync("components/home/*.tsx")];
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n").toLowerCase();

  assert.match(source, /#f7fbf4/);
  assert.match(source, /#8fde68/);
  assert.match(source, /#d8e8d3/);
  assert.doesNotMatch(source, /#fff4a8/);
  assert.doesNotMatch(source, /#9eef72/);
});
