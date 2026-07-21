import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { Invoice } from "../types/invoice.ts";
import { mockInvoices } from "./mockData.ts";
import { getV2InvoiceAsInvoice } from "./v2MockData.ts";

const storeRoot = process.env.VERCEL ? tmpdir() : process.cwd();

export const DEFAULT_INVOICE_STORE_PATH =
  process.env.STFLOW_INVOICE_STORE_PATH ??
  join(storeRoot, ".stflow-data", "invoices.json");

let invoiceStoreMutation = Promise.resolve();

export function isInvoiceRecord(value: unknown): value is Invoice {
  if (!value || typeof value !== "object") return false;

  const invoice = value as Partial<Invoice>;
  return (
    typeof invoice.id === "string" &&
    typeof invoice.merchantWallet === "string" &&
    typeof invoice.title === "string" &&
    typeof invoice.amount === "string" &&
    invoice.currency === "USDC" &&
    (invoice.status === "pending" || invoice.status === "paid" || invoice.status === "expired") &&
    typeof invoice.chainId === "number" &&
    typeof invoice.createdAt === "string"
  );
}

function normalizeStorePayload(value: unknown): Invoice[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isInvoiceRecord);
}

export async function readInvoiceStore(storePath = DEFAULT_INVOICE_STORE_PATH) {
  try {
    const payload = await readFile(storePath, "utf8");
    return normalizeStorePayload(JSON.parse(payload));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }

    if (error instanceof SyntaxError) {
      const corruptPath = `${storePath}.corrupt-${Date.now()}`;
      await rename(storePath, corruptPath).catch(() => undefined);
      return [];
    }

    throw error;
  }
}

async function writeInvoiceStore(invoices: Invoice[], storePath = DEFAULT_INVOICE_STORE_PATH) {
  await mkdir(dirname(storePath), { recursive: true });
  const tempPath = `${storePath}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(tempPath, JSON.stringify(invoices, null, 2), "utf8");
  await rename(tempPath, storePath);
}

export async function upsertInvoiceInStore(invoice: Invoice, storePath = DEFAULT_INVOICE_STORE_PATH) {
  const mutation = invoiceStoreMutation.then(async () => {
    const invoices = await readInvoiceStore(storePath);
    const nextInvoices = [
      invoice,
      ...invoices.filter((storedInvoice) => storedInvoice.id !== invoice.id)
    ];

    await writeInvoiceStore(nextInvoices, storePath);
    return invoice;
  });

  invoiceStoreMutation = mutation.then(
    () => undefined,
    () => undefined
  );

  return mutation;
}

export async function getInvoiceFromStore(invoiceId: string, storePath = DEFAULT_INVOICE_STORE_PATH) {
  const invoices = await readInvoiceStore(storePath);
  return (
    invoices.find((invoice) => invoice.id === invoiceId) ??
    mockInvoices.find((invoice) => invoice.id === invoiceId) ??
    getV2InvoiceAsInvoice(invoiceId) ??
    null
  );
}
