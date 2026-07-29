import assert from "node:assert/strict";
import test from "node:test";
import { getConsoleInvoiceData } from "../lib/consoleInvoiceData.ts";
import { formatCurrency, parseUsdc } from "../lib/format.ts";
import type { Invoice } from "../types/invoice.ts";

const merchant = "0x0000000000000000000000000000000000000001";
const payer = "0x0000000000000000000000000000000000000002";

function invoice(id: string, amount: string): Invoice {
  return {
    id,
    merchantWallet: merchant,
    customerWallet: payer,
    title: "Invoice",
    amount,
    currency: "USDC",
    status: "paid",
    chainId: 5042002,
    createdAt: "2026-01-01T00:00:00.000Z"
  };
}

test("formats uint128-scale USDC without floating point loss", () => {
  const max = 340282366920938463463374607431768211455n;
  assert.equal(
    formatCurrency(max),
    "340,282,366,920,938,463,463,374,607,431,768.211455 USDC"
  );
});

test("dashboard aggregation remains exact above 2^53", () => {
  const data = getConsoleInvoiceData(
    [
      invoice("a", "9007199254740992.000001"),
      invoice("b", "0.000001")
    ],
    merchant
  );
  assert.equal(data.summary.totalReceived, parseUsdc("9007199254740992.000002"));
  assert.equal(formatCurrency(data.summary.totalReceived), "9,007,199,254,740,992.000002 USDC");
});
