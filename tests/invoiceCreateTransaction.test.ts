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
  createReferenceId,
  beginCreateRequest,
  invoiceCreatedEvent,
  nextCreateStage,
  parseInvoiceAmount,
  parseInvoiceDeadline,
  resolveConfirmedCreation,
  validatePrewriteSnapshot,
  reduceCreateState,
  validateInvoiceCreated
} from "../lib/invoiceCreateTransaction.ts";

const REGISTRY = "0x1111111111111111111111111111111111111111";
const MERCHANT = "0x2222222222222222222222222222222222222222";
const PAYER = "0x3333333333333333333333333333333333333333";
const ID = `0x${"44".repeat(32)}` as Hex;
const HASH = `0x${"55".repeat(32)}` as Hex;
const TX_HASH = `0x${"66".repeat(32)}` as Hex;
const REQUEST_A = `0x${"77".repeat(32)}` as Hex;
const REQUEST_B = `0x${"88".repeat(32)}` as Hex;

const expected = {
  id: ID,
  merchant: getAddress(MERCHANT),
  payer: getAddress(PAYER),
  amount: BigInt(250_000000),
  dueAt: BigInt(2_000_000000),
  metadataHash: HASH
};

function createdLog(overrides: Partial<typeof expected> = {}, address: Address = REGISTRY) {
  const args = { ...expected, ...overrides };
  return {
    address,
    topics: encodeEventTopics({
      abi: [invoiceCreatedEvent],
      eventName: "InvoiceCreated",
      args: {
        id: args.id,
        merchant: args.merchant,
        payer: args.payer
      }
    }) as [Hex, ...Hex[]],
    data: encodeAbiParameters(
      [{ type: "uint128" }, { type: "uint64" }, { type: "bytes32" }],
      [args.amount, args.dueAt, args.metadataHash]
    )
  };
}

test("moves through signing, confirming, and saved stages", () => {
  assert.equal(nextCreateStage("idle", "wallet_requested"), "signing");
  assert.equal(nextCreateStage("signing", "hash_received"), "confirming");
  assert.equal(nextCreateStage("confirming", "receipt_confirmed"), "persisting");
  assert.equal(nextCreateStage("persisting", "metadata_saved"), "saved");
  assert.equal(nextCreateStage("persisting", "metadata_failed"), "saved");
  assert.equal(nextCreateStage("confirming", "receipt_reverted"), "error");
});

test("rejects invalid stage transitions", () => {
  assert.throws(
    () => nextCreateStage("idle", "receipt_confirmed"),
    /Invalid invoice creation transition/
  );
});

test("allows another creation attempt after success or error", () => {
  assert.equal(nextCreateStage("saved", "wallet_requested"), "signing");
  assert.equal(nextCreateStage("error", "wallet_requested"), "signing");
});

test("rejects a duplicate start while another creation owns the mutex", () => {
  assert.equal(beginCreateRequest(undefined, REQUEST_A), REQUEST_A);
  assert.throws(
    () => beginCreateRequest(REQUEST_A, REQUEST_B),
    /already in progress/
  );
});

test("parses USDC amounts without floating-point conversion", () => {
  assert.equal(parseInvoiceAmount("250.000001"), BigInt(250_000001));
  assert.equal(parseInvoiceAmount("0.000001"), BigInt(1));
});

test("rejects empty, signed, exponential, zero, and over-precise amounts", () => {
  for (const amount of ["", "-1", "+1", "1e3", "0", "0.0000001", "1."]) {
    assert.throws(() => parseInvoiceAmount(amount), /valid USDC amount/);
  }
});

test("accepts the uint128 amount boundary and rejects one micro-USDC above it", () => {
  assert.equal(
    parseInvoiceAmount("340282366920938463463374607431768.211455"),
    (BigInt(1) << BigInt(128)) - BigInt(1)
  );
  assert.throws(
    () => parseInvoiceAmount("340282366920938463463374607431768.211456"),
    /valid USDC amount/
  );
});

test("parses a future invoice deadline as uint64 seconds", () => {
  assert.equal(
    parseInvoiceDeadline("2033-05-18T03:33:20.000Z", BigInt(1_999_999_999)),
    BigInt(2_000_000_000)
  );
});

test("rejects missing, invalid, expired, and uint64-overflow deadlines", () => {
  for (const deadline of ["", "not-a-date", "2020-01-01T00:00:00.000Z"]) {
    assert.throws(
      () => parseInvoiceDeadline(deadline, BigInt(2_000_000_000)),
      /valid future payment deadline/
    );
  }

  assert.throws(
    () => parseInvoiceDeadline("+999999-01-01T00:00:00.000Z", BigInt(0)),
    /valid future payment deadline/
  );
});

test("creates a bytes32 reference from browser-grade random bytes", () => {
  const reference = createReferenceId((bytes) => {
    bytes.fill(0xab);
    return bytes;
  });

  assert.equal(reference, `0x${"ab".repeat(32)}`);
});

test("validates the sole matching InvoiceCreated event", () => {
  assert.deepEqual(
    validateInvoiceCreated(
      { status: "success", logs: [createdLog()] },
      REGISTRY,
      expected
    ),
    expected
  );
});

test("rejects reverted receipts", () => {
  assert.throws(
    () =>
      validateInvoiceCreated(
        { status: "reverted", logs: [createdLog()] },
        REGISTRY,
        expected
      ),
    /reverted/
  );
});

test("rejects missing or multiple creation events from the registry", () => {
  assert.throws(
    () => validateInvoiceCreated({ status: "success", logs: [] }, REGISTRY, expected),
    /exactly one/
  );
  assert.throws(
    () =>
      validateInvoiceCreated(
        { status: "success", logs: [createdLog(), createdLog()] },
        REGISTRY,
        expected
      ),
    /exactly one/
  );
});

test("ignores matching event signatures emitted by another contract", () => {
  const other = "0x7777777777777777777777777777777777777777";
  assert.throws(
    () =>
      validateInvoiceCreated(
        { status: "success", logs: [createdLog({}, other)] },
        REGISTRY,
        expected
      ),
    /exactly one/
  );
});

test("rejects every mismatched creation event field", () => {
  const cases: Partial<typeof expected>[] = [
    { id: `0x${"01".repeat(32)}` },
    { merchant: getAddress("0x8888888888888888888888888888888888888888") },
    { payer: getAddress("0x9999999999999999999999999999999999999999") },
    { amount: BigInt(1) },
    { dueAt: BigInt(1) },
    { metadataHash: `0x${"02".repeat(32)}` }
  ];

  for (const mismatch of cases) {
    assert.throws(
      () =>
        validateInvoiceCreated(
          { status: "success", logs: [createdLog(mismatch)] },
          REGISTRY,
          expected
        ),
      /does not match/
    );
  }
});

test("retains the transaction and invoice when metadata persistence fails", () => {
  const confirming = {
    stage: "confirming" as const,
    requestId: REQUEST_A,
    txHash: TX_HASH
  };
  const saved = reduceCreateState(confirming, {
    type: "receipt_confirmed",
    requestId: REQUEST_A,
    invoice: expected
  });
  const pending = reduceCreateState(saved, {
    type: "metadata_failed",
    requestId: REQUEST_A,
    error: "Metadata service unavailable"
  });

  assert.equal(pending.stage, "saved");
  assert.equal(pending.txHash, TX_HASH);
  assert.deepEqual(pending.invoice, expected);
  assert.equal(pending.metadataPending, true);
  assert.equal(pending.error, "Metadata service unavailable");
});

test("keeps receipt confirmation busy until metadata reaches a terminal result", () => {
  const state = reduceCreateState(
    { stage: "confirming", requestId: REQUEST_A, txHash: TX_HASH },
    { type: "receipt_confirmed", requestId: REQUEST_A, invoice: expected }
  );

  assert.equal(state.stage, "persisting");
  assert.equal(state.metadataPending, true);
});

test("ignores stale actions from an older request", () => {
  const current = {
    stage: "signing" as const,
    requestId: REQUEST_B
  };
  const stale = reduceCreateState(current, {
    type: "hash_received",
    requestId: REQUEST_A,
    txHash: TX_HASH
  });

  assert.equal(stale, current);
});

test("preserves confirmed transaction recovery data when a retry starts", () => {
  const retry = reduceCreateState(
    {
      stage: "saved",
      requestId: REQUEST_A,
      txHash: TX_HASH,
      invoice: expected,
      metadataPending: true,
      error: "Metadata service unavailable"
    },
    { type: "wallet_requested", requestId: REQUEST_B }
  );

  assert.equal(retry.stage, "signing");
  assert.equal(retry.txHash, undefined);
  assert.equal(retry.recovery?.txHash, TX_HASH);
  assert.deepEqual(retry.recovery?.invoice, expected);
});

test("aborts before broadcast when the wallet or chain no longer matches", () => {
  assert.throws(
    () =>
      validatePrewriteSnapshot(
        {
          address: getAddress("0x9999999999999999999999999999999999999999"),
          chainId: 5042002
        },
        expected.merchant
      ),
    /wallet changed/
  );
  assert.throws(
    () =>
      validatePrewriteSnapshot(
        { address: expected.merchant, chainId: 1 },
        expected.merchant
      ),
    /network changed/
  );
});

test("returns a confirmed invoice even if the wallet changes after broadcast", () => {
  const result = resolveConfirmedCreation({
    invoice: expected,
    requestId: REQUEST_A,
    txHash: TX_HASH,
    metadataError: "Metadata service unavailable"
  });

  assert.equal(result.invoice, expected);
  assert.equal(result.txHash, TX_HASH);
  assert.equal(result.metadataPending, true);
});

test("creation flow is chain-backed and isolated from the legacy invoice route", async () => {
  const [hook, form, created] = await Promise.all([
    readFile("hooks/useCreateInvoice.ts", "utf8"),
    readFile("components/InvoiceForm.tsx", "utf8"),
    readFile("components/invoice/InvoiceCreated.tsx", "utf8")
  ]);

  assert.match(hook, /createInvoice/);
  assert.match(hook, /waitForTransactionReceipt/);
  assert.match(hook, /useRef/);
  assert.match(hook, /activeRequest/);
  assert.match(hook, /getAccount|getChainId/);
  assert.match(hook, /\/api\/v1\/invoices\/metadata/);
  assert.match(hook, /\/api\/v1\/auth\/nonce/);
  assert.match(hook, /signMessage/);
  assert.match(hook, /retryMetadata/);
  assert.match(created, /Retry metadata/);
  const retryBody = hook.match(/const retryMetadata = useCallback\(([\s\S]*?)\n  \);/)?.[1] ?? "";
  assert.doesNotMatch(retryBody, /writeContract/);
  assert.doesNotMatch(hook, /JSON\.stringify\(\{\s*invoice,/);
  assert.doesNotMatch(hook, /\/api\/invoices/);
  assert.doesNotMatch(form, /MOCK_MERCHANT_A|useInvoices|createMockInvoice/);
  assert.match(form, /latestRequest/);
  assert.match(
    await readFile("components/invoice/InvoiceFields.tsx", "utf8"),
    /<fieldset[\s\S]*disabled=\{disabled\}[\s\S]*step="0\.000001"/
  );
  assert.match(created, /getArcExplorerTxUrl/);
});
