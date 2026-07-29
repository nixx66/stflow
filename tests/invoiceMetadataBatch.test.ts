import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseMetadataBatchRequest } from "../lib/server/internal/invoiceMetadataBatch.ts";

const id = `0x${"a".repeat(64)}`;

test("metadata batch accepts at most 100 unique bytes32 ids", () => {
  assert.deepEqual(parseMetadataBatchRequest({ invoiceIds: [id, id] }), [id]);
  assert.throws(
    () =>
      parseMetadataBatchRequest({
        invoiceIds: Array.from({ length: 101 }, (_, i) => {
          return `0x${(i + 1).toString(16).padStart(64, "0")}`;
        })
      }),
    /at most 100/i
  );
});

test("metadata batch rejects malformed bodies and ids", () => {
  assert.throws(() => parseMetadataBatchRequest(null), /object/i);
  assert.throws(() => parseMetadataBatchRequest({ invoiceIds: ["invoice-1"] }), /bytes32/i);
});

test("batch route is bounded, deployment-scoped, and returns metadata only", () => {
  const route = readFileSync("app/api/v1/invoices/metadata/batch/route.ts", "utf8");
  const repository = readFileSync("lib/server/invoiceMetadataRepository.ts", "utf8");
  assert.match(route, /readBoundedJson\(request,\s*16_384\)/);
  assert.match(route, /config\.chainId/);
  assert.match(route, /config\.invoiceRegistryAddress/);
  assert.doesNotMatch(route, /\bamount_raw\b|\bmerchant_wallet\b|\bpayer_wallet\b/);
  assert.match(repository, /\.in\("invoice_id", identity\.invoiceIds\)/);
  assert.match(repository, /\.eq\("chain_id", identity\.chainId\)/);
  assert.match(repository, /\.eq\("registry_address", identity\.registry\)/);
});
