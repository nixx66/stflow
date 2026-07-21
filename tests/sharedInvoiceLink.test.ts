import test from "node:test";
import assert from "node:assert/strict";
import {
  buildSharedInvoicePayPath,
  decodeSharedInvoice,
  encodeSharedInvoice
} from "../lib/sharedInvoiceLink.ts";
import type { Invoice } from "../types/invoice.ts";

const invoice: Invoice = {
  id: "af-share-test",
  merchantWallet: "0x96d7560000000000000000000000000000000c5a",
  customerName: "付款人 B",
  customerWallet: "0x918ac0c2f83ac477a075deb4713c38f78ac006b4",
  title: "USDC checkout invoice",
  description: "Stablecoin checkout payment for settlement tracking.",
  memo: "Thanks for your payment.",
  amount: "250",
  currency: "USDC",
  status: "pending",
  chainId: 5042002,
  createdAt: "2026-07-18T00:00:00.000Z",
  expiresAt: "2026-07-19T00:00:00.000Z"
};

test("encodes and decodes a shareable invoice payload", () => {
  const encoded = encodeSharedInvoice(invoice);
  const decoded = decodeSharedInvoice(encoded, invoice.id);

  assert.equal(decoded?.id, invoice.id);
  assert.equal(decoded?.customerName, "付款人 B");
  assert.equal(decoded?.merchantWallet, invoice.merchantWallet);
  assert.equal(decoded?.amount, "250");
});

test("rejects shared invoice payloads for a different route id", () => {
  const encoded = encodeSharedInvoice(invoice);

  assert.equal(decodeSharedInvoice(encoded, "af-other"), null);
});

test("builds a payment path that carries the invoice snapshot", () => {
  const path = buildSharedInvoicePayPath(invoice);

  assert.equal(path.startsWith(`/pay/${invoice.id}?invoice=`), true);
  assert.equal(decodeSharedInvoice(new URL(`http://stflow.local${path}`).searchParams.get("invoice"), invoice.id)?.id, invoice.id);
});

test("uses browser-safe encoding when wallet extensions inject a Buffer global", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalBuffer = Object.getOwnPropertyDescriptor(globalThis, "Buffer");

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {}
  });
  Object.defineProperty(globalThis, "Buffer", {
    configurable: true,
    value: {
      from() {
        throw new Error("Injected wallet Buffer is not compatible.");
      }
    }
  });

  try {
    const encoded = encodeSharedInvoice(invoice);
    assert.equal(decodeSharedInvoice(encoded, invoice.id)?.id, invoice.id);
  } finally {
    if (originalWindow) {
      Object.defineProperty(globalThis, "window", originalWindow);
    } else {
      Reflect.deleteProperty(globalThis, "window");
    }

    if (originalBuffer) {
      Object.defineProperty(globalThis, "Buffer", originalBuffer);
    } else {
      Reflect.deleteProperty(globalThis, "Buffer");
    }
  }
});
