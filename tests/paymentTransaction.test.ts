import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  encodeAbiParameters,
  encodeEventTopics,
  getAddress,
  type Address,
  type Hex
} from "viem";
import {
  beginPayment,
  getPaymentPlan,
  invoicePaidEvent,
  reducePaymentState,
  validateConfirmedPayment,
  validateInvoicePaid,
  validatePaymentSnapshot,
  validatePaymentWrite
} from "../lib/paymentTransaction.ts";

const REGISTRY = "0x1111111111111111111111111111111111111111";
const MERCHANT = getAddress("0x2222222222222222222222222222222222222222");
const PAYER = getAddress("0x3333333333333333333333333333333333333333");
const OTHER = getAddress("0x4444444444444444444444444444444444444444");
const ID = `0x${"55".repeat(32)}` as Hex;
const REQUEST_A = `0x${"66".repeat(32)}` as Hex;
const REQUEST_B = `0x${"77".repeat(32)}` as Hex;
const APPROVAL_HASH = `0x${"88".repeat(32)}` as Hex;
const PAYMENT_HASH = `0x${"99".repeat(32)}` as Hex;

const invoice = {
  id: ID,
  merchant: MERCHANT,
  payer: PAYER,
  amount: BigInt("340282366920938463463374607431768211455"),
  createdAt: BigInt(1_900_000_000),
  dueAt: BigInt(2_100_000_000),
  paidAt: BigInt(0),
  metadataHash: `0x${"aa".repeat(32)}` as Hex,
  status: 0
} as const;

function paidLog(
  overrides: Partial<{
    id: Hex;
    payer: Address;
    merchant: Address;
    amount: bigint;
  }> = {},
  address: Address = REGISTRY
) {
  const args = {
    id: ID,
    payer: PAYER,
    merchant: MERCHANT,
    amount: invoice.amount,
    ...overrides
  };

  return {
    address,
    topics: encodeEventTopics({
      abi: [invoicePaidEvent],
      eventName: "InvoicePaid",
      args: { id: args.id, payer: args.payer, merchant: args.merchant }
    }) as [Hex, ...Hex[]],
    data: encodeAbiParameters([{ type: "uint128" }], [args.amount])
  };
}

test("plans an exact approval when allowance is below the invoice amount", () => {
  assert.deepEqual(getPaymentPlan(BigInt(100_000000), BigInt(0), BigInt(25_000000)), {
    canPay: true,
    needsApproval: true,
    approvalAmount: BigInt(25_000000)
  });
});

test("skips approval when the existing allowance covers the invoice", () => {
  assert.deepEqual(
    getPaymentPlan(BigInt(100_000000), BigInt(25_000000), BigInt(25_000000)),
    { canPay: true, needsApproval: false, approvalAmount: BigInt(0) }
  );
});

test("reports insufficient balance without losing bigint precision", () => {
  const amount = (BigInt(1) << BigInt(127)) + BigInt(9);
  assert.deepEqual(getPaymentPlan(amount - BigInt(1), amount, amount), {
    canPay: false,
    needsApproval: false,
    approvalAmount: BigInt(0)
  });
});

test("rejects the wrong payer, non-pending invoices, and the expiry boundary", () => {
  assert.throws(
    () => validatePaymentSnapshot(invoice, OTHER, BigInt(2_000_000_000)),
    /assigned payer/
  );
  assert.throws(
    () => validatePaymentSnapshot({ ...invoice, status: 1 }, PAYER, BigInt(2_000_000_000)),
    /not pending/
  );
  assert.throws(
    () => validatePaymentSnapshot(invoice, PAYER, invoice.dueAt),
    /expired/
  );
});

test("accepts the assigned payer before the deadline", () => {
  assert.equal(
    validatePaymentSnapshot(invoice, PAYER, invoice.dueAt - BigInt(1)),
    invoice
  );
});

test("requires the original account and Arc chain before each unbroadcast write", () => {
  assert.throws(
    () => validatePaymentWrite({ address: OTHER, chainId: 5042002 }, PAYER),
    /wallet changed/
  );
  assert.throws(
    () => validatePaymentWrite({ address: PAYER, chainId: 1 }, PAYER),
    /network changed/
  );
  assert.doesNotThrow(() =>
    validatePaymentWrite({ address: PAYER, chainId: 5042002 }, PAYER)
  );
});

test("validates one exact InvoicePaid event from the configured registry", () => {
  assert.deepEqual(
    validateInvoicePaid(
      { status: "success", logs: [paidLog()] },
      REGISTRY,
      { id: ID, payer: PAYER, merchant: MERCHANT, amount: invoice.amount }
    ),
    { id: ID, payer: PAYER, merchant: MERCHANT, amount: invoice.amount }
  );
});

test("rejects reverted, spoofed, multiple, and mismatched payment events", () => {
  const expected = { id: ID, payer: PAYER, merchant: MERCHANT, amount: invoice.amount };
  assert.throws(
    () => validateInvoicePaid({ status: "reverted", logs: [paidLog()] }, REGISTRY, expected),
    /reverted/
  );
  assert.throws(
    () => validateInvoicePaid({ status: "success", logs: [paidLog({}, OTHER)] }, REGISTRY, expected),
    /exactly one/
  );
  assert.throws(
    () => validateInvoicePaid({ status: "success", logs: [paidLog(), paidLog()] }, REGISTRY, expected),
    /exactly one/
  );
  assert.throws(
    () => validateInvoicePaid({ status: "success", logs: [paidLog({ amount: BigInt(1) })] }, REGISTRY, expected),
    /does not match/
  );
});

test("requires a final Paid chain re-read with a non-zero paidAt", () => {
  assert.equal(
    validateConfirmedPayment({ ...invoice, status: 1, paidAt: BigInt(2_000_000_001) }, invoice),
    true
  );
  assert.throws(() => validateConfirmedPayment(invoice, invoice), /not confirmed/);
  assert.throws(
    () =>
      validateConfirmedPayment(
        { ...invoice, status: 1, paidAt: BigInt(2_000_000_001), amount: BigInt(1) },
        invoice
      ),
    /changed/
  );
});

test("serializes payment attempts and ignores stale request actions", () => {
  assert.equal(beginPayment(undefined, REQUEST_A), REQUEST_A);
  assert.throws(() => beginPayment(REQUEST_A, REQUEST_B), /already in progress/);

  const current = { stage: "approval-signing" as const, requestId: REQUEST_B };
  assert.equal(
    reducePaymentState(current, {
      type: "approval_hash",
      requestId: REQUEST_A,
      txHash: APPROVAL_HASH
    }),
    current
  );
});

test("preserves broadcast hashes through confirmation and later wallet changes", () => {
  let state = reducePaymentState(
    { stage: "idle" },
    { type: "started", requestId: REQUEST_A }
  );
  assert.equal(state.stage, "checking");
  state = reducePaymentState(state, {
    type: "planned",
    requestId: REQUEST_A,
    needsApproval: true
  });
  state = reducePaymentState(state, {
    type: "approval_hash",
    requestId: REQUEST_A,
    txHash: APPROVAL_HASH
  });
  state = reducePaymentState(state, {
    type: "approval_confirmed",
    requestId: REQUEST_A
  });
  state = reducePaymentState(state, {
    type: "payment_hash",
    requestId: REQUEST_A,
    txHash: PAYMENT_HASH
  });
  state = reducePaymentState(state, {
    type: "payment_confirmed",
    requestId: REQUEST_A
  });

  assert.equal(state.stage, "success");
  assert.equal(state.approvalTxHash, APPROVAL_HASH);
  assert.equal(state.paymentTxHash, PAYMENT_HASH);
});

test("payment hook contains no mock settlement or direct transfer path", async () => {
  const hook = await readFile("hooks/usePayInvoice.ts", "utf8");
  assert.match(hook, /getInvoice/);
  assert.match(hook, /allowance/);
  assert.match(hook, /approve/);
  assert.match(hook, /payInvoice/);
  assert.match(hook, /waitForTransactionReceipt/);
  assert.doesNotMatch(hook, /createMockTxHash|markInvoicePaid|payMockInvoice/);
  assert.doesNotMatch(hook, /functionName:\s*"transfer"/);
  assert.doesNotMatch(hook, /syncInvoiceToServer|localStorage/);
});
