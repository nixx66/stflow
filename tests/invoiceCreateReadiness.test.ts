import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  getInvoiceCreateReadiness,
  isValidInvoiceWalletAddress
} from "../lib/invoiceCreateReadiness.ts";

test("marks invoice creation requirements as ready when core fields are present", () => {
  const items = getInvoiceCreateReadiness({
    title: "Settlement sprint deposit",
    amount: "1250",
    merchantWallet: "0xA12F8E7D5C4B3A2918076F5E4D3C2B1A09876543",
    expiresAt: "2026-07-20T10:00"
  });

  assert.equal(items.every((item) => item.ready), true);
});

test("detects missing or invalid invoice creation inputs", () => {
  const items = getInvoiceCreateReadiness({
    title: "",
    amount: "0",
    merchantWallet: "",
    expiresAt: ""
  });

  assert.deepEqual(
    items.map((item) => [item.id, item.ready]),
    [
      ["title", false],
      ["amount", false],
      ["merchant-wallet", false],
      ["expiry", false]
    ]
  );
});

test("accepts valid EVM addresses without requiring checksum casing", () => {
  assert.equal(
    isValidInvoiceWalletAddress("0x742d35Cc6634C0532925a3b844Bc9e7595f2bD88"),
    true
  );
});

test("keeps invoice field source order stable", () => {
  const source = readFileSync("components/invoice/InvoiceFields.tsx", "utf8");
  const fields = ["customerName", "customerWallet", "title", "description", "amount", "expiresAt", "memo"];
  const positions = fields.map((field) => source.indexOf(`change(\"${field}\"`));

  assert.equal(positions.every((position) => position >= 0), true);
  assert.deepEqual([...positions].sort((left, right) => left - right), positions);
});
