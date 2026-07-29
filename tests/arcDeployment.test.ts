import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  ARC_CHAIN_ID,
  ARC_USDC,
  buildDeploymentRequest,
  materializeRuntimeBytecode,
  parseCliArgs,
  saveDeploymentRecord,
  validateDeployment,
  validateManifest,
} from "../scripts/arcDeployment.mjs";

const registry = "0x1111111111111111111111111111111111111111";
const deployer = "0x2222222222222222222222222222222222222222";
const tx = `0x${"33".repeat(32)}`;
const blockHash = `0x${"44".repeat(32)}`;
const sourcePath = "contracts/src/STFlowInvoiceRegistry.sol";

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
  metadata: { compiler: { version: "0.8.30+commit.73712a01" } },
};
const settings = {
  optimizer: { enabled: true, runs: 200 },
  evmVersion: "osaka",
  metadata: { bytecodeHash: "ipfs", appendCBOR: true },
  viaIR: false,
  remappings: ["@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"],
  libraries: {},
};
const buildInfo = {
  id: "build-id",
  solcVersion: "0.8.30",
  input: {
    language: "Solidity",
    sources: { [sourcePath]: { content: "contract Registry {}\n" } },
    settings,
  },
};
const request = buildDeploymentRequest({
  artifact,
  buildInfo,
  artifactJson: JSON.stringify(artifact),
  buildInfoJson: JSON.stringify(buildInfo),
  standardJson: JSON.stringify(buildInfo.input),
  commit: "a".repeat(40),
  sourceHashes: { [sourcePath]: { sha256: "source", keccak256: "0xsource" } },
});

function rpcFixture(overrides: Record<string, unknown> = {}) {
  const runtime = materializeRuntimeBytecode(
    request.bytecode.runtimeTemplate,
    request.bytecode.immutableReferences,
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
      to: null,
    },
    eth_getTransactionByHash: {
      hash: tx,
      from: deployer,
      blockNumber: "0x2a",
      blockHash,
      to: null,
      input: request.bytecode.creationData,
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

async function verify(overrides: Record<string, unknown> = {}) {
  return validateDeployment({
    address: registry,
    tx,
    request,
    rpc: rpcFixture(overrides),
  });
}

test("request seals full release provenance and rejects mutation", () => {
  assert.equal(request.schemaVersion, 1);
  assert.equal(request.source.sourceCommit, "a".repeat(40));
  assert.equal(request.compiler.settings.evmVersion, "osaka");
  assert.equal(request.compiler.settings.metadata.appendCBOR, true);
  assert.equal(request.bytecode.creationDataBytes, (request.bytecode.creationData.length - 2) / 2);
  assert.match(request.hashes.artifactSha256, /^[0-9a-f]{64}$/);
  assert.doesNotThrow(() => validateManifest(request));

  const changed = structuredClone(request);
  changed.constructor.usdc = deployer;
  assert.throws(() => validateManifest(changed), /checksum/i);
});

test("CLI parser rejects unknown, duplicate, missing, and valueless flags", () => {
  const definitions = {
    "--address": { name: "address", flag: "--address", required: true },
    "--write": { name: "write", flag: "--write", boolean: true },
  };
  assert.deepEqual(parseCliArgs(["--address", registry], definitions), { address: registry });
  assert.throws(() => parseCliArgs(["--wat"], definitions), /unknown/i);
  assert.throws(
    () => parseCliArgs(["--address", registry, "--address", registry], definitions),
    /duplicate/i,
  );
  assert.throws(() => parseCliArgs([], definitions), /required/i);
  assert.throws(() => parseCliArgs(["--address", "--write"], definitions), /requires a value/i);
});

test("immutable matching injects the fixed USDC into every reference", () => {
  assert.equal(
    materializeRuntimeBytecode(
      artifact.deployedBytecode.object,
      artifact.deployedBytecode.immutableReferences,
      ARC_USDC,
    ),
    `0x6000${"0".repeat(24)}${ARC_USDC.slice(2)}6000`,
  );
});

test("verification rejects wrong chain, placeholder, failed receipt, and address drift", async () => {
  await assert.rejects(verify({ eth_chainId: "0x1" }), /wrong chain/i);
  await assert.rejects(
    validateDeployment({
      address: "0x0000000000000000000000000000000000000000",
      tx,
      request,
      rpc: rpcFixture(),
    }),
    /placeholder/i,
  );
  await assert.rejects(verify({ eth_getTransactionReceipt: null }), /receipt/i);
  await assert.rejects(
    verify({
      eth_getTransactionReceipt: {
        status: "0x1",
        transactionHash: tx,
        contractAddress: deployer,
        blockNumber: "0x2a",
        blockHash,
        from: deployer,
        to: null,
      },
    }),
    /address/i,
  );
});

test("verification requires an exact contract-creation transaction", async () => {
  const base = {
    hash: tx,
    from: deployer,
    blockNumber: "0x2a",
    blockHash,
    to: null,
    input: request.bytecode.creationData,
  };
  await assert.rejects(
    verify({ eth_getTransactionByHash: { ...base, to: registry } }),
    /create a contract/i,
  );
  for (const to of [registry, undefined]) {
    await assert.rejects(
      verify({
        eth_getTransactionReceipt: {
          status: "0x1",
          transactionHash: tx,
          contractAddress: registry,
          blockNumber: "0x2a",
          blockHash,
          from: deployer,
          ...(to === undefined ? {} : { to }),
        },
      }),
      /receipt must describe contract creation/i,
    );
  }
  await assert.rejects(
    verify({ eth_getTransactionByHash: { ...base, input: "0x6000" } }),
    /input/i,
  );
  await assert.rejects(
    verify({ eth_getTransactionByHash: { ...base, blockHash: `0x${"55".repeat(32)}` } }),
    /block evidence/i,
  );
  await assert.rejects(
    verify({ eth_getTransactionByHash: { ...base, from: registry } }),
    /deployers differ/i,
  );
  await assert.rejects(
    verify({
      eth_getTransactionByHash: {
        ...base,
        from: "0x0000000000000000000000000000000000000000",
      },
      eth_getTransactionReceipt: {
        status: "0x1",
        transactionHash: tx,
        contractAddress: registry,
        blockNumber: "0x2a",
        blockHash,
        from: "0x0000000000000000000000000000000000000000",
        to: null,
      },
    }),
    /placeholder/i,
  );
  await assert.rejects(
    verify({
      eth_getTransactionByHash: { ...base, blockHash: `0x${"00".repeat(32)}` },
      eth_getTransactionReceipt: {
        status: "0x1",
        transactionHash: tx,
        contractAddress: registry,
        blockNumber: "0x2a",
        blockHash: `0x${"00".repeat(32)}`,
        from: deployer,
        to: null,
      },
    }),
    /placeholder/i,
  );
});

test("verification rejects bytecode, immutable USDC, and malformed decimals", async () => {
  await assert.rejects(verify({ eth_getCode: "0x" }), /bytecode/i);
  await assert.rejects(verify({ eth_getCode: "0x6001" }), /bytecode/i);
  await assert.rejects(
    verify({ usdc: `0x${"0".repeat(24)}${deployer.slice(2)}` }),
    /usdc/i,
  );
  await assert.rejects(verify({ decimals: "0x06" }), /malformed/i);
  await assert.rejects(verify({ decimals: `0x${"0".repeat(63)}5` }), /decimals/i);
});

test("valid evidence record is tied to the request source rather than current HEAD", async () => {
  const record = await verify();

  assert.equal(record.address, registry);
  assert.equal(record.transactionHash, tx);
  assert.equal(record.block.number, 42);
  assert.equal(record.block.hash, blockHash);
  assert.equal(record.deployer, deployer);
  assert.equal(record.source.commit, "a".repeat(40));
  assert.equal(record.source.standardJsonSha256, request.hashes.standardJsonSha256);
  assert.equal(record.codeHashes.creationData, request.hashes.creationDataKeccak);
  assert.equal(record.request.checksum.value, request.manifestChecksum.value);
  assert.equal(record.verification.sourceCode, false);
  assert.match(record.validatedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test("validated record writes only with explicit approval and never overwrites", async () => {
  const dir = await mkdtemp(join(tmpdir(), "arc-deployment-write-"));
  const output = join(dir, "arc-testnet.json");
  const record = await verify();

  assert.equal(await saveDeploymentRecord({ record, output, write: false }), false);
  await assert.rejects(readFile(output), /ENOENT/);
  assert.equal(await saveDeploymentRecord({ record, output, write: true }), true);
  assert.deepEqual(JSON.parse(await readFile(output, "utf8")), record);
  await assert.rejects(saveDeploymentRecord({ record, output, write: true }), /EEXIST/);
});
