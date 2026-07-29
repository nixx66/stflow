import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const LOWERCASE_ADDRESS = "0x1111111111111111111111111111111111111111";
const CHECKSUMMED_ADDRESS = "0x5294E9927c3306DcBaDb03fe70b92e01cCede505";
const INVALID_CHECKSUM = "0x5294e9927c3306DcBaDb03fe70b92e01cCede505";

let importIndex = 0;

async function importRegistry(address: string | undefined) {
  const previous = process.env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS;

  if (address === undefined) {
    delete process.env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS;
  } else {
    process.env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS = address;
  }

  try {
    importIndex += 1;
    return await import(
      `../lib/contracts/invoiceRegistry.ts?test=${importIndex}`
    );
  } finally {
    if (previous === undefined) {
      delete process.env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS;
    } else {
      process.env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS = previous;
    }
  }
}

function projectAbi(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(projectAbi);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const entry = value as Record<string, unknown>;
  const projected: Record<string, unknown> = {};

  for (const key of [
    "type",
    "name",
    "stateMutability",
    "anonymous",
    "indexed",
    "inputs",
    "outputs",
    "components"
  ]) {
    if (key in entry) {
      projected[key] = projectAbi(entry[key]);
    }
  }

  return projected;
}

function sortedEntries(abi: readonly unknown[]) {
  return abi.map((entry) => JSON.stringify(projectAbi(entry))).sort();
}

test("rejects a missing registry address", async () => {
  await assert.rejects(
    importRegistry(undefined),
    /NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS/
  );
});

test("rejects a malformed registry address", async () => {
  await assert.rejects(
    importRegistry("not-an-address"),
    /NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS/
  );
});

test("rejects mixed-case registry addresses with an invalid checksum", async () => {
  await assert.rejects(
    importRegistry(INVALID_CHECKSUM),
    /NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS/
  );
});

test("accepts and normalizes a lowercase registry address", async () => {
  const registry = await importRegistry(LOWERCASE_ADDRESS);
  assert.equal(registry.INVOICE_REGISTRY_ADDRESS, LOWERCASE_ADDRESS);
});

test("accepts a valid checksummed registry address", async () => {
  const registry = await importRegistry(CHECKSUMMED_ADDRESS);
  assert.equal(registry.INVOICE_REGISTRY_ADDRESS, CHECKSUMMED_ADDRESS);
});

test("matches the reviewed Foundry contract ABI", async () => {
  const registry = await importRegistry(LOWERCASE_ADDRESS);
  const artifact = JSON.parse(
    await readFile(
      "contracts/out/STFlowInvoiceRegistry.sol/STFlowInvoiceRegistry.json",
      "utf8"
    )
  ) as { abi: unknown[] };
  const publicArtifactAbi = artifact.abi.filter(
    (entry) =>
      typeof entry === "object" &&
      entry !== null &&
      (entry as { type?: string }).type !== "constructor"
  );

  assert.deepEqual(
    sortedEntries(registry.invoiceRegistryAbi),
    sortedEntries(publicArtifactAbi)
  );
});
