import assert from "node:assert/strict";
import test from "node:test";
import { mergeInvoicesById } from "../lib/invoice.ts";
import { mockInvoices } from "../lib/mockData.ts";

test("mergeInvoicesById keeps the preferred copy and stable order", () => {
  const preferred = { ...mockInvoices[0], title: "Preferred" };
  const merged = mergeInvoicesById([preferred], mockInvoices);

  assert.equal(merged[0].title, "Preferred");
  assert.equal(new Set(merged.map(({ id }) => id)).size, merged.length);
});
