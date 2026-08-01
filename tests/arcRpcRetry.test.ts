import assert from "node:assert/strict";
import test from "node:test";
import {
  ARC_BUSY_MESSAGE,
  isTransientArcRpcError,
  retryArcRead
} from "../lib/arcRpcRetry.ts";

test("retries transient Arc RPC failures with bounded backoff", async () => {
  let attempts = 0;
  const delays: number[] = [];

  const result = await retryArcRead(
    async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("request limit reached");
      return "invoice";
    },
    async (delay) => {
      delays.push(delay);
    }
  );

  assert.equal(result, "invoice");
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [300, 900]);
});

test("sanitizes a transient Arc RPC failure after retries are exhausted", async () => {
  let attempts = 0;

  await assert.rejects(
    retryArcRead(
      async () => {
        attempts += 1;
        throw new Error("RPC Request failed. URL: https://rpc.testnet.arc.network request limit reached calldata 0xdeadbeef");
      },
      async () => undefined
    ),
    { message: ARC_BUSY_MESSAGE }
  );
  assert.equal(attempts, 3);
});

test("does not retry contract or wallet failures", async () => {
  let attempts = 0;

  await assert.rejects(
    retryArcRead(async () => {
      attempts += 1;
      throw new Error("Invoice has expired.");
    }),
    { message: "Invoice has expired." }
  );
  assert.equal(attempts, 1);
  assert.equal(isTransientArcRpcError(new Error("execution reverted")), false);
});
