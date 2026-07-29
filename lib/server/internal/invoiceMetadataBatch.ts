import { isHash } from "viem";

export function parseMetadataBatchRequest(value: unknown) {
  if (!value || typeof value !== "object" || !Array.isArray((value as { invoiceIds?: unknown }).invoiceIds)) {
    throw new Error("Request body must be an object with invoiceIds.");
  }
  const ids = (value as { invoiceIds: unknown[] }).invoiceIds;
  if (ids.length > 100) throw new Error("invoiceIds accepts at most 100 values.");
  const unique = new Set<string>();
  for (const id of ids) {
    if (typeof id !== "string" || !isHash(id) || id.length !== 66) {
      throw new Error("Every invoice ID must be bytes32.");
    }
    unique.add(id.toLowerCase());
  }
  return [...unique];
}
