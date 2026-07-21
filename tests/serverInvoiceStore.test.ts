import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  getInvoiceFromStore,
  readInvoiceStore,
  upsertInvoiceInStore
} from "../lib/serverInvoiceStore.ts";
import type { Invoice } from "../types/invoice.ts";

const invoice: Invoice = {
  id: "af-server-share",
  merchantWallet: "0x96d7560000000000000000000000000000000c5a",
  customerName: "Wallet B",
  customerWallet: "0x918ac0c2f83ac477a075deb4713c38f78ac006b4",
  title: "USDC checkout invoice",
  amount: "250",
  currency: "USDC",
  status: "pending",
  chainId: 5042002,
  createdAt: "2026-07-18T00:00:00.000Z"
};

test("persists invoices so another browser can load a bare payment link", async () => {
  const folder = await mkdtemp(join(tmpdir(), "stflow-store-"));
  const storePath = join(folder, "invoices.json");

  try {
    await upsertInvoiceInStore(invoice, storePath);

    const storedInvoice = await getInvoiceFromStore(invoice.id, storePath);
    const allInvoices = await readInvoiceStore(storePath);

    assert.equal(storedInvoice?.id, invoice.id);
    assert.equal(storedInvoice?.merchantWallet, invoice.merchantWallet);
    assert.equal(allInvoices.length, 1);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("updates existing invoices without duplicating records", async () => {
  const folder = await mkdtemp(join(tmpdir(), "stflow-store-"));
  const storePath = join(folder, "invoices.json");

  try {
    await upsertInvoiceInStore(invoice, storePath);
    await upsertInvoiceInStore({ ...invoice, status: "paid", paymentTxHash: "0xabc", payerWallet: invoice.customerWallet }, storePath);

    const allInvoices = await readInvoiceStore(storePath);

    assert.equal(allInvoices.length, 1);
    assert.equal(allInvoices[0].status, "paid");
    assert.equal(allInvoices[0].paymentTxHash, "0xabc");
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("recovers from a corrupt invoice store file", async () => {
  const folder = await mkdtemp(join(tmpdir(), "stflow-store-"));
  const storePath = join(folder, "invoices.json");

  try {
    await writeFile(storePath, "[{\"id\":\"partial\"}]broken", "utf8");

    const initialInvoices = await readInvoiceStore(storePath);
    await upsertInvoiceInStore(invoice, storePath);
    const storedPayload = await readFile(storePath, "utf8");
    const allInvoices = await readInvoiceStore(storePath);

    assert.deepEqual(initialInvoices, []);
    assert.doesNotThrow(() => JSON.parse(storedPayload));
    assert.equal(allInvoices.length, 1);
    assert.equal(allInvoices[0].id, invoice.id);
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});

test("falls back to seeded invoices when a direct invoice lookup cold-starts", async () => {
  const folder = await mkdtemp(join(tmpdir(), "stflow-store-"));
  const storePath = join(folder, "invoices.json");

  try {
    const storedInvoice = await getInvoiceFromStore("af-1001", storePath);

    assert.equal(storedInvoice?.id, "af-1001");
    assert.equal(storedInvoice?.status, "paid");
  } finally {
    await rm(folder, { recursive: true, force: true });
  }
});
