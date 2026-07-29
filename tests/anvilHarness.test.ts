import assert from "node:assert/strict";
import test from "node:test";

import {
  AnvilStartError,
  startAnvil,
  type AnvilAttempt,
} from "./support/anvil.ts";

test("retries address conflicts on fresh ports and stops once", async () => {
  const ports = [41_001, 41_002, 41_003];
  let launches = 0;
  let stops = 0;
  const launch: AnvilAttempt = async ({ port }) => {
    launches += 1;
    if (launches < 3) {
      throw new AnvilStartError("bind", `port ${port} is already in use`);
    }
    return {
      rpcUrl: `http://127.0.0.1:${port}`,
      stop: async () => {
        stops += 1;
      },
    };
  };

  const anvil = await startAnvil({
    executable: "anvil-test",
    nextPort: async () => ports.shift()!,
    launch,
  });
  await Promise.all([anvil.stop(), anvil.stop()]);

  assert.equal(launches, 3);
  assert.equal(anvil.rpcUrl, "http://127.0.0.1:41003");
  assert.equal(stops, 1);
});

test("does not retry a fatal Anvil startup error", async () => {
  let launches = 0;
  const launch: AnvilAttempt = async () => {
    launches += 1;
    throw new AnvilStartError("fatal", "unknown option");
  };

  await assert.rejects(
    startAnvil({
      executable: "anvil-test",
      nextPort: async () => 41_010,
      launch,
    }),
    /unknown option/,
  );
  assert.equal(launches, 1);
});

test("bounds address-conflict retries", async () => {
  let launches = 0;
  const launch: AnvilAttempt = async () => {
    launches += 1;
    throw new AnvilStartError("bind", "address already in use");
  };

  await assert.rejects(
    startAnvil({
      executable: "anvil-test",
      nextPort: async () => 41_020 + launches,
      launch,
    }),
    /after 5 attempts/,
  );
  assert.equal(launches, 5);
});
