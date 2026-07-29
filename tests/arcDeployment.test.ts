import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  ARC_CHAIN_ID,
  ARC_USDC,
  buildDeploymentRequest,
  buildStandardJsonInput,
  materializeRuntimeBytecode,
  saveDeploymentRecord,
  validateDeployment,
} from "../scripts/arcDeployment.mjs";

const registry = "0x1111111111111111111111111111111111111111";
const deployer = "0x2222222222222222222222222222222222222222";
const tx = `0x${"33".repeat(32)}`;
const blockHash = `0x${"44".repeat(32)}`;

const artifact = {
  abi: [
    {
      type: "constructor",
      inputs: [{ name: "usdcAddress", type: "address", internalType: "address" }],
      stateMutability: "nonpayable",
    },
  ],
  bytecode: { object: "0x60006000" },
  deployedBytecode: {
    object: `0x6000${"00".repeat(32)}6000`,
    immutableReferences: { "60": [{ start: 2, length: 32 }] },
  },
  metadata: {
    compiler: { version: "0.8.30+commit.73712a01" },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      compilationTarget: {
        "contracts/src/STFlowInvoiceRegistry.sol": "STFlowInvoiceRegistry",
      },
    },
  },
};

function rpcFixture(overrides: Record<string, unknown> = {}) {
  const runtime = materializeRuntimeBytecode(
    artifact.deployedBytecode.object,
    artifact.deployedBytecode.immutableReferences,
    ARC_USDC,
  );
  const values: Record<string, unknown> = {
    eth_chainId: `0x${ARC_CHAIN_ID.toString(16)}`,
    eth_getTransactionReceipt: {
      status: "0x1",
      transactionHash: tx,
      contractAddress: registry,
      blockNumber: "0x2a",
      blockHash,
      from: deployer,
    },
    eth_getTransactionByHash: {
      hash: tx,
      from: deployer,
      blockNumber: "0x2a",
    },
    eth_getCode: runtime,
    usdc: `0x${"0".repeat(24)}${ARC_USDC.slice(2)}`,
    decimals: `0x${"0".repeat(63)}6`,
    ...overrides,
  };

  return async (method: string, params: unknown[]) => {
    if (method === "eth_call") {
      const data = (params[0] as { data: string }).data;
      return data.startsWith("0x3e413bee") ? values.usdc : values.decimals;
    }
    return values[method];
  };
}

test("deployment request encodes the fixed USDC constructor and checksums", () => {
  const request = buildDeploymentRequest({
    artifact,
    buildInfo: {
      id: "build-1",
      source_id_to_path: {
        "0": "contracts/src/STFlowInvoiceRegistry.sol",
      },
      language: "Solidity",
    },
    commit: "a".repeat(40),
  });

  assert.equal(request.chainId, ARC_CHAIN_ID);
  assert.equal(request.constructor.usdc, ARC_USDC);
  assert.match(request.creationData, /^0x60006000[0-9a-f]{64}$/);
  assert.match(request.checksums.creationDataKeccak, /^0x[0-9a-f]{64}$/);
  assert.match(request.checksums.runtimeArtifactKeccak, /^0x[0-9a-f]{64}$/);
  assert.equal(request.source.commit, "a".repeat(40));
  assert.equal(request.compiler.version, "0.8.30+commit.73712a01");
  assert.deepEqual(request.compiler.optimizer, { enabled: true, runs: 200 });
});

test("immutable runtime matching replaces every reference with USDC", () => {
  const runtime = materializeRuntimeBytecode(
    artifact.deployedBytecode.object,
    artifact.deployedBytecode.immutableReferences,
    ARC_USDC,
  );

  assert.equal(runtime, `0x6000${"0".repeat(24)}${ARC_USDC.slice(2)}6000`);
});

test("standard JSON input is built from artifact metadata and checked-in sources", async () => {
  const input = await buildStandardJsonInput({
    artifact: {
      ...artifact,
      metadata: {
        ...artifact.metadata,
        language: "Solidity",
        sources: {
          "contracts/src/STFlowInvoiceRegistry.sol": {
            keccak256: "0xsource",
            license: "MIT",
          },
        },
        settings: {
          ...artifact.metadata.settings,
          remappings: ["@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"],
        },
      },
    },
    readSource: async (path: string) => `source:${path}`,
  });

  assert.equal(input.language, "Solidity");
  assert.equal(
    input.sources["contracts/src/STFlowInvoiceRegistry.sol"].content,
    "source:contracts/src/STFlowInvoiceRegistry.sol",
  );
  assert.deepEqual(input.settings.optimizer, { enabled: true, runs: 200 });
  assert.deepEqual(input.settings.outputSelection, {
    "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"] },
  });
});

test("verification rejects a wrong chain", async () => {
  await assert.rejects(
    validateDeployment({
      address: registry,
      tx,
      artifact,
      commit: "a".repeat(40),
      rpc: rpcFixture({ eth_chainId: "0x1" }),
    }),
    /wrong chain/i,
  );
});

test("verification rejects placeholder address and transaction values", async () => {
  await assert.rejects(
    validateDeployment({
      address: "0x0000000000000000000000000000000000000000",
      tx,
      artifact,
      commit: "a".repeat(40),
      rpc: rpcFixture(),
    }),
    /placeholder/i,
  );
  await assert.rejects(
    validateDeployment({
      address: registry,
      tx: `0x${"00".repeat(32)}`,
      artifact,
      commit: "a".repeat(40),
      rpc: rpcFixture(),
    }),
    /placeholder/i,
  );
});

test("verification rejects failed and missing receipts", async () => {
  for (const receipt of [null, { status: "0x0" }]) {
    await assert.rejects(
      validateDeployment({
        address: registry,
        tx,
        artifact,
        commit: "a".repeat(40),
        rpc: rpcFixture({ eth_getTransactionReceipt: receipt }),
      }),
      /receipt/i,
    );
  }
});

test("verification rejects a mismatched deployment address", async () => {
  await assert.rejects(
    validateDeployment({
      address: registry,
      tx,
      artifact,
      commit: "a".repeat(40),
      rpc: rpcFixture({
        eth_getTransactionReceipt: {
          status: "0x1",
          transactionHash: tx,
          contractAddress: deployer,
          blockNumber: "0x2a",
          blockHash,
          from: deployer,
        },
      }),
    }),
    /address/i,
  );
});

test("verification rejects receipt evidence for another transaction", async () => {
  await assert.rejects(
    validateDeployment({
      address: registry,
      tx,
      artifact,
      commit: "a".repeat(40),
      rpc: rpcFixture({
        eth_getTransactionReceipt: {
          status: "0x1",
          transactionHash: `0x${"55".repeat(32)}`,
          contractAddress: registry,
          blockNumber: "0x2a",
          blockHash,
          from: deployer,
        },
      }),
    }),
    /transaction/i,
  );
});

test("verification rejects empty or foreign runtime bytecode", async () => {
  for (const code of ["0x", "0x6001"]) {
    await assert.rejects(
      validateDeployment({
        address: registry,
        tx,
        artifact,
        commit: "a".repeat(40),
        rpc: rpcFixture({ eth_getCode: code }),
      }),
      /bytecode/i,
    );
  }
});

test("verification rejects the wrong immutable USDC and decimals", async () => {
  await assert.rejects(
    validateDeployment({
      address: registry,
      tx,
      artifact,
      commit: "a".repeat(40),
      rpc: rpcFixture({ usdc: `0x${"0".repeat(24)}${deployer.slice(2)}` }),
    }),
    /usdc/i,
  );
  await assert.rejects(
    validateDeployment({
      address: registry,
      tx,
      artifact,
      commit: "a".repeat(40),
      rpc: rpcFixture({ decimals: `0x${"0".repeat(63)}5` }),
    }),
    /decimals/i,
  );
});

test("valid verification returns evidence without writing by default", async () => {
  const dir = await mkdtemp(join(tmpdir(), "arc-deployment-"));
  const output = join(dir, "arc-testnet.json");
  const record = await validateDeployment({
    address: registry,
    tx,
    artifact,
    commit: "a".repeat(40),
    rpc: rpcFixture(),
  });

  assert.equal(record.address, registry);
  assert.equal(record.transactionHash, tx);
  assert.equal(record.block.number, 42);
  assert.equal(record.deployer, deployer);
  assert.equal(record.constructor.usdc, ARC_USDC);
  assert.equal(record.verification.sourceCode, false);
  await assert.rejects(readFile(output), /ENOENT/);
});

test("validated record is only written when explicitly enabled", async () => {
  const dir = await mkdtemp(join(tmpdir(), "arc-deployment-write-"));
  const output = join(dir, "arc-testnet.json");
  const record = { address: registry };

  assert.equal(await saveDeploymentRecord({ record, output, write: false }), false);
  await assert.rejects(readFile(output), /ENOENT/);
  assert.equal(await saveDeploymentRecord({ record, output, write: true }), true);
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), record);
});
