import test from "node:test";
import assert from "node:assert/strict";
import {
  createMockInvoice,
  getInvoiceById,
  getStoredInvoices,
  saveStoredInvoices
} from "../lib/invoice.ts";

const originalWindowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");

function setFailingBrowserStorage() {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem() {
          throw new Error("storage unavailable");
        },
        setItem() {
          throw new Error("storage unavailable");
        }
      },
      dispatchEvent() {
        throw new Error("events unavailable");
      }
    }
  });
}

function restoreWindow() {
  if (originalWindowDescriptor) {
    Object.defineProperty(globalThis, "window", originalWindowDescriptor);
    return;
  }

  Reflect.deleteProperty(globalThis, "window");
}

test("keeps invoice creation usable when browser storage is unavailable", () => {
  setFailingBrowserStorage();

  try {
    assert.doesNotThrow(() => saveStoredInvoices([]));
    assert.doesNotThrow(() => getStoredInvoices());

    const invoice = createMockInvoice({
      merchantWallet: "0x96d7560000000000000000000000000000000c5a",
      customerName: "Wallet B",
      customerWallet: "0x918ac0c2f83ac477a075deb4713c38f78ac006b4",
      title: "USDC checkout invoice",
      amount: "250"
    });

    assert.equal(invoice.status, "pending");
    assert.equal(invoice.currency, "USDC");
  } finally {
    restoreWindow();
  }
});

test("can resolve seeded receipt invoices without browser initialization", () => {
  restoreWindow();

  const invoice = getInvoiceById("af-1001");

  assert.equal(invoice?.id, "af-1001");
  assert.equal(invoice?.status, "paid");
});
