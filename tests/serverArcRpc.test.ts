import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import test from "node:test";
import { spawn } from "node:child_process";

type RpcReply = {
  readonly status?: number;
  readonly error?: { readonly code: number; readonly message: string };
  readonly blockNumber?: string;
};

type RpcServer = {
  readonly url: string;
  readonly requests: () => number;
  readonly close: () => Promise<void>;
};

function startRpcServer(reply: RpcReply, token: string): Promise<RpcServer> {
  let requestCount = 0;
  const server = createServer(async (request, response) => {
    requestCount += 1;
    let body = "";
    for await (const chunk of request) {
      body += chunk;
    }
    const rpcRequest = JSON.parse(body) as { readonly id: number; readonly method: string };
    const result =
      rpcRequest.method === "eth_chainId"
        ? "0x4cef52"
        : rpcRequest.method === "eth_blockNumber"
          ? reply.blockNumber
          : undefined;

    response.writeHead(reply.status ?? 200, { "content-type": "application/json" });
    response.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: rpcRequest.id,
        ...(reply.error ? { error: reply.error } : { result })
      })
    );
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Local RPC test server did not bind."));
        return;
      }
      resolve({
        url: `http://127.0.0.1:${address.port}/v2/${token}`,
        requests: () => requestCount,
        close: () => closeServer(server)
      });
    });
  });
}

function closeServer(server: Server) {
  return new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function runClient(rpcUrls: readonly string[]) {
  const script = `
    const { createArcServerClient } = await import('./lib/server/arcRpc.ts');
    const urls = JSON.parse(process.env.ARC_RPC_TEST_URLS);
    const serializeError = (value, seen = new WeakSet(), depth = 0) => {
      if (value === null || typeof value !== 'object') return value;
      if (depth > 8) return '[truncated]';
      if (seen.has(value)) return '[circular]';
      seen.add(value);
      return Object.fromEntries(
        Object.getOwnPropertyNames(value).map((key) => [
          key,
          serializeError(value[key], seen, depth + 1)
        ])
      );
    };
    try {
      const blockNumber = await createArcServerClient(urls).getBlockNumber();
      process.stdout.write(JSON.stringify({ blockNumber: blockNumber.toString() }));
    } catch (error) {
      process.stdout.write(JSON.stringify({ error: serializeError(error) }));
    }
  `;

  return new Promise<{ readonly status: number | null; readonly output: string }>(
    (resolve, reject) => {
      const child = spawn(
        process.execPath,
        ["--conditions=react-server", "--input-type=module", "--eval", script],
        {
          cwd: process.cwd(),
          env: { ...process.env, ARC_RPC_TEST_URLS: JSON.stringify(rpcUrls) },
          stdio: ["ignore", "pipe", "pipe"]
        }
      );
      let output = "";
      let errors = "";
      child.stdout.on("data", (chunk) => {
        output += chunk;
      });
      child.stderr.on("data", (chunk) => {
        errors += chunk;
      });
      child.once("error", reject);
      child.once("close", (status) => {
        if (status !== 0) {
          reject(new Error(`Arc RPC test client exited unexpectedly: ${errors}`));
          return;
        }
        resolve({ status, output });
      });
    }
  );
}

test("fails over from a transient Arc RPC HTTP failure to the next configured endpoint", async () => {
  const primaryToken = "primary_token_123456789";
  const fallbackToken = "fallback_token_987654321";
  const primary = await startRpcServer(
    { status: 503, blockNumber: "0x0" },
    primaryToken
  );
  const fallback = await startRpcServer({ blockNumber: "0x2a" }, fallbackToken);

  try {
    const result = await runClient([primary.url, fallback.url]);
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.output), { blockNumber: "42" });
    assert.ok(primary.requests() >= 1 && primary.requests() <= 2);
    assert.equal(fallback.requests(), 1);
    assert.doesNotMatch(result.output, new RegExp(primary.url, "i"));
    assert.doesNotMatch(result.output, new RegExp(fallback.url, "i"));
  } finally {
    await Promise.all([primary.close(), fallback.close()]);
  }
});

test("surfaces a contract execution error without sending it to the fallback endpoint or leaking URLs", async () => {
  const primaryToken = "primary_contract_token_123456789";
  const fallbackToken = "fallback_contract_token_987654321";
  const primary = await startRpcServer({
    error: { code: 3, message: "execution reverted: Invoice expired" }
  }, primaryToken);
  const fallback = await startRpcServer({ blockNumber: "0x2a" }, fallbackToken);

  try {
    const result = await runClient([primary.url, fallback.url]);
    assert.equal(result.status, 0);
    const payload = JSON.parse(result.output) as { error: Record<string, unknown> };
    assert.equal(payload.error.code, 3);
    assert.equal(payload.error.details, "execution reverted: Invoice expired");
    assert.equal(primary.requests(), 1);
    assert.equal(fallback.requests(), 0);
    assert.doesNotMatch(result.output, new RegExp(primary.url, "i"));
    assert.doesNotMatch(result.output, new RegExp(fallback.url, "i"));
    assert.doesNotMatch(result.output, new RegExp(primaryToken, "i"));
    assert.doesNotMatch(result.output, new RegExp(fallbackToken, "i"));
  } finally {
    await Promise.all([primary.close(), fallback.close()]);
  }
});

test("surfaces JSON-RPC invalid-parameter errors without fallback or endpoint leaks", async () => {
  const primaryToken = "primary_invalid_params_token_123456789";
  const fallbackToken = "fallback_invalid_params_token_987654321";
  const primary = await startRpcServer({
    error: { code: -32602, message: "invalid parameters" }
  }, primaryToken);
  const fallback = await startRpcServer({ blockNumber: "0x2a" }, fallbackToken);

  try {
    const result = await runClient([primary.url, fallback.url]);
    assert.equal(result.status, 0);
    const payload = JSON.parse(result.output) as { error: Record<string, unknown> };
    assert.equal(payload.error.code, -32602);
    assert.equal(payload.error.details, "invalid parameters");
    assert.equal(primary.requests(), 1);
    assert.equal(fallback.requests(), 0);
    assert.doesNotMatch(result.output, new RegExp(primary.url, "i"));
    assert.doesNotMatch(result.output, new RegExp(fallback.url, "i"));
    assert.doesNotMatch(result.output, new RegExp(primaryToken, "i"));
    assert.doesNotMatch(result.output, new RegExp(fallbackToken, "i"));
  } finally {
    await Promise.all([primary.close(), fallback.close()]);
  }
});

test("redacts query and path endpoint keys echoed by a JSON-RPC error", async () => {
  const pathToken = "primary_path_token_123456789";
  const queryToken = "primary_query_token_987654321==";
  const fallbackToken = "fallback_query_token_123456789";
  const primary = await startRpcServer({
    error: {
      code: -32602,
      message: `invalid parameters: ${pathToken}; ${queryToken}`
    }
  }, pathToken);
  const fallback = await startRpcServer({ blockNumber: "0x2a" }, fallbackToken);
  const primaryUrl = `${primary.url}?apiKey=${queryToken}`;

  try {
    const result = await runClient([primaryUrl, fallback.url]);
    assert.equal(result.status, 0);
    const payload = JSON.parse(result.output) as { error: Record<string, unknown> };
    assert.equal(payload.error.code, -32602);
    assert.equal(
      payload.error.details,
      "invalid parameters: [redacted endpoint]; [redacted endpoint]"
    );
    assert.equal(primary.requests(), 1);
    assert.equal(fallback.requests(), 0);
    assert.doesNotMatch(result.output, new RegExp(primaryUrl, "i"));
    assert.doesNotMatch(result.output, new RegExp(pathToken, "i"));
    assert.doesNotMatch(result.output, new RegExp(queryToken, "i"));
  } finally {
    await Promise.all([primary.close(), fallback.close()]);
  }
});

test("redacts percent-encoded and decoded Basic-auth credentials echoed by a JSON-RPC error", async () => {
  const username = "primary_user+token_123456789";
  const password = "primary_password/token=987654321";
  const rawUsername = encodeURIComponent(username);
  const rawPassword = encodeURIComponent(password);
  const pathToken = "primary_credentials_path_123456789";
  const fallbackToken = "fallback_credentials_token_123456789";
  const primary = await startRpcServer({
    error: {
      code: -32602,
      message: `invalid credentials: ${rawUsername}; ${rawPassword}; ${username}; ${password}`
    }
  }, pathToken);
  const fallback = await startRpcServer({ blockNumber: "0x2a" }, fallbackToken);
  const primaryUrl = primary.url.replace(
    "http://",
    `http://${rawUsername}:${rawPassword}@`
  );

  try {
    const result = await runClient([primaryUrl, fallback.url]);
    assert.equal(result.status, 0);
    const payload = JSON.parse(result.output) as { error: Record<string, unknown> };
    assert.equal(payload.error.code, -32602);
    assert.equal(
      payload.error.details,
      "invalid credentials: [redacted endpoint]; [redacted endpoint]; [redacted endpoint]; [redacted endpoint]"
    );
    assert.equal(primary.requests(), 1);
    assert.equal(fallback.requests(), 0);
    for (const credential of [rawUsername, rawPassword, username, password]) {
      assert.doesNotMatch(result.output, new RegExp(credential, "i"));
    }
  } finally {
    await Promise.all([primary.close(), fallback.close()]);
  }
});

test("redacts short Basic-auth credentials in raw, decoded, and encoded forms", async () => {
  const username = "usr";
  const password = "pwd";
  const rawUsername = "%75sr";
  const rawPassword = "p%77d";
  const encodedUsername = encodeURIComponent(username);
  const encodedPassword = encodeURIComponent(password);
  const primary = await startRpcServer({
    error: {
      code: -32602,
      message: `invalid credentials: ${rawUsername}; ${rawPassword}; ${username}; ${password}; ${encodedUsername}; ${encodedPassword}`
    }
  }, "short_credentials_path_token");
  const fallback = await startRpcServer(
    { blockNumber: "0x2a" },
    "short_credentials_fallback_token"
  );
  const primaryUrl = primary.url.replace(
    "http://",
    `http://${rawUsername}:${rawPassword}@`
  );

  try {
    const result = await runClient([primaryUrl, fallback.url]);
    assert.equal(result.status, 0);
    const payload = JSON.parse(result.output) as { error: Record<string, unknown> };
    assert.equal(payload.error.code, -32602);
    assert.equal(
      payload.error.details,
      "invalid credentials: [redacted endpoint]; [redacted endpoint]; [redacted endpoint]; [redacted endpoint]; [redacted endpoint]; [redacted endpoint]"
    );
    assert.equal(primary.requests(), 1);
    assert.equal(fallback.requests(), 0);
    for (const credential of [
      rawUsername,
      rawPassword,
      username,
      password,
      encodedUsername,
      encodedPassword
    ]) {
      assert.doesNotMatch(result.output, new RegExp(credential, "i"));
    }
  } finally {
    await Promise.all([primary.close(), fallback.close()]);
  }
});
