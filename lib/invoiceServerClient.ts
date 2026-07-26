import type { Invoice } from "@/types/invoice";

type InvoiceResponse = {
  invoice?: Invoice;
};

type InvoicesResponse = {
  invoices?: Invoice[];
};

const INVOICE_FETCH_TIMEOUT_MS = 5000;

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  return {
    signal: controller.signal,
    done: () => clearTimeout(timeout)
  };
}

export async function syncInvoiceToServer(invoice: Invoice) {
  try {
    const response = await fetch("/api/invoices", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(invoice)
    });

    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchInvoiceFromServer(invoiceId: string) {
  const { signal, done } = withTimeout(INVOICE_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`, {
      cache: "no-store",
      signal
    });

    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Unable to load invoice from local server.");

    const payload = (await response.json()) as InvoiceResponse;
    return payload.invoice ?? null;
  } finally {
    done();
  }
}

export async function fetchInvoicesFromServer() {
  try {
    const response = await fetch("/api/invoices", {
      cache: "no-store"
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as InvoicesResponse;
    return Array.isArray(payload.invoices) ? payload.invoices : [];
  } catch {
    return [];
  }
}
