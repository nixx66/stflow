import type { Invoice } from "../types/invoice.ts";

export const SHARED_INVOICE_PARAM = "invoice";

function encodeUtf8Base64Url(value: string) {
  if (typeof window === "undefined" && typeof Buffer !== "undefined") {
    return Buffer.from(value, "utf8").toString("base64url");
  }

  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeUtf8Base64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  if (typeof window === "undefined" && typeof Buffer !== "undefined") {
    return Buffer.from(padded, "base64").toString("utf8");
  }

  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function isSharedInvoice(value: unknown): value is Invoice {
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

export function encodeSharedInvoice(invoice: Invoice) {
  return encodeUtf8Base64Url(JSON.stringify(invoice));
}

export function decodeSharedInvoice(payload: string | null | undefined, expectedInvoiceId?: string) {
  if (!payload) return null;

  try {
    const invoice = JSON.parse(decodeUtf8Base64Url(payload)) as unknown;

    if (!isSharedInvoice(invoice)) return null;
    if (expectedInvoiceId && invoice.id !== expectedInvoiceId) return null;

    return invoice;
  } catch {
    return null;
  }
}

export function buildSharedInvoicePayPath(invoice: Invoice) {
  const params = new URLSearchParams({
    [SHARED_INVOICE_PARAM]: encodeSharedInvoice(invoice)
  });

  return `/pay/${invoice.id}?${params.toString()}`;
}

export function buildSharedInvoicePayUrl(origin: string, invoice: Invoice) {
  return `${origin}${buildSharedInvoicePayPath(invoice)}`;
}
