import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { keccak256, encodeDeployData, getAddress, toFunctionSelector } from "viem";

export const ARC_CHAIN_ID = 5_042_002;
export const ARC_RPC_URL = "https://rpc.testnet.arc.network";
export const ARC_EXPLORER_URL = "https://testnet.arcscan.app";
export const ARC_USDC = "0x3600000000000000000000000000000000000000";

const hexPattern = /^0x[0-9a-fA-F]*$/;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function sealManifest(payload) {
  const manifest = canonical(payload);
  return {
    ...manifest,
    manifestChecksum: {
      algorithm: "sha256",
      value: sha256(JSON.stringify(manifest)),
    },
  };
}

export function validateManifest(manifest) {
  if (manifest?.schemaVersion !== 1) throw new Error("unsupported deployment request version");
  const { manifestChecksum, ...payload } = manifest;
  if (
    manifestChecksum?.algorithm !== "sha256" ||
    manifestChecksum.value !== sha256(JSON.stringify(canonical(payload)))
  ) {
    throw new Error("deployment request checksum is invalid");
  }
  return canonical(payload);
}

export function parseCliArgs(argv, definitions) {
  const output = {};
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const definition = definitions[flag];
    if (!definition) throw new Error(`unknown argument: ${flag}`);
    if (Object.hasOwn(output, definition.name)) throw new Error(`duplicate argument: ${flag}`);
    if (definition.boolean) {
      output[definition.name] = true;
      continue;
    }
    const value = argv[++index];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    output[definition.name] = value;
  }
  for (const definition of Object.values(definitions)) {
    if (definition.required && !Object.hasOwn(output, definition.name)) {
      throw new Error(`${definition.flag} is required`);
    }
  }
  return output;
}

function requireHex(value, label) {
  if (typeof value !== "string" || !hexPattern.test(value)) {
    throw new Error(`${label} is not hex`);
  }
  return value.toLowerCase();
}

function constructorAbi(artifact) {
  const constructors = artifact.abi.filter((item) => item.type === "constructor");
  if (
    constructors.length !== 1 ||
    constructors[0].inputs.length !== 1 ||
    constructors[0].inputs[0].type !== "address"
  ) {
    throw new Error("registry constructor must contain exactly one address");
  }
  return constructors[0];
}

export function materializeRuntimeBytecode(bytecode, references, immutableAddress) {
  const bytes = requireHex(bytecode, "runtime bytecode").slice(2);
  const replacement = getAddress(immutableAddress).slice(2).toLowerCase().padStart(64, "0");
  const locations = Object.values(references ?? {}).flat();
  let output = bytes;

  for (const { start, length } of locations) {
    if (length !== 32 || start < 0 || (start + length) * 2 > output.length) {
      throw new Error("unsupported immutable reference");
    }
    output = `${output.slice(0, start * 2)}${replacement}${output.slice((start + length) * 2)}`;
  }

  return `0x${output}`;
}

export function buildDeploymentRequest({
  artifact,
  buildInfo,
  artifactJson,
  buildInfoJson,
  standardJson,
  commit,
  sourceHashes,
}) {
  constructorAbi(artifact);
  const bytecode = requireHex(artifact.bytecode?.object, "creation bytecode");
  const runtime = requireHex(artifact.deployedBytecode?.object, "runtime bytecode");
  if (bytecode === "0x" || runtime === "0x") throw new Error("contract bytecode is empty");
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error("source commit must be a full SHA");
  if (
    buildInfo?.input?.language !== "Solidity" ||
    !buildInfo.input.sources?.["contracts/src/STFlowInvoiceRegistry.sol"]
  ) {
    throw new Error("build info does not contain the registry source");
  }

  const creationData = encodeDeployData({
    abi: artifact.abi,
    bytecode,
    args: [ARC_USDC],
  });
  const settings = buildInfo.input.settings;
  const compilerVersion = artifact.metadata?.compiler?.version;

  if (
    buildInfo.solcVersion !== "0.8.30" ||
    compilerVersion !== "0.8.30+commit.73712a01" ||
    settings?.optimizer?.enabled !== true ||
    settings?.optimizer?.runs !== 200 ||
    typeof settings.evmVersion !== "string" ||
    settings.metadata?.bytecodeHash !== "ipfs" ||
    settings.metadata?.appendCBOR !== true ||
    settings.viaIR !== false ||
    !Array.isArray(settings.remappings) ||
    typeof settings.libraries !== "object"
  ) {
    throw new Error("artifact compiler settings do not match the release profile");
  }

  return sealManifest({
    schemaVersion: 1,
    status: "NOT_DEPLOYED",
    chainId: ARC_CHAIN_ID,
    rpcUrl: ARC_RPC_URL,
    explorerUrl: ARC_EXPLORER_URL,
    contract: "STFlowInvoiceRegistry",
    constructor: { usdc: ARC_USDC },
    creationData,
    compiler: { version: compilerVersion, settings },
    source: {
      sourceCommit: commit,
      target: "contracts/src/STFlowInvoiceRegistry.sol:STFlowInvoiceRegistry",
      buildInfoId: buildInfo.id,
      files: sourceHashes,
    },
    bytecode: {
      init: bytecode,
      runtimeTemplate: runtime,
      immutableReferences: artifact.deployedBytecode.immutableReferences ?? {},
      creationData,
      creationDataBytes: (creationData.length - 2) / 2,
    },
    hashes: {
      creationDataKeccak: keccak256(creationData),
      runtimeArtifactKeccak: keccak256(runtime),
      artifactSha256: sha256(artifactJson),
      buildInfoSha256: sha256(buildInfoJson),
      standardJsonSha256: sha256(standardJson),
    },
    sourceVerification: {
      format: "Solidity standard JSON input",
      file: ".stflow-deployment/standard-input.json",
    },
  });
}

export async function buildStandardJsonInput({ buildInfo, readSource }) {
  const sources = {};

  for (const path of Object.keys(buildInfo.input.sources ?? {}).sort()) {
    sources[path] = { content: await readSource(path) };
  }

  return {
    language: buildInfo.input.language,
    sources,
    settings: buildInfo.input.settings,
  };
}

export async function saveDeploymentRecord({ record, output, write }) {
  if (!write) return false;
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(record, null, 2)}\n`, { flag: "wx" });
  return true;
}

function expectAddress(value, label) {
  try {
    return getAddress(value);
  } catch {
    throw new Error(`${label} is not a valid address`);
  }
}

function rejectPlaceholder(value, label, digits) {
  if (new RegExp(`^0x0{${digits}}$`, "i").test(value)) {
    throw new Error(`${label} is a placeholder`);
  }
}

function decodeAddress(value, label) {
  const hex = requireHex(value, label);
  if (hex.length !== 66) throw new Error(`${label} returned malformed data`);
  return expectAddress(`0x${hex.slice(-40)}`, label);
}

function decodeUint(value, label) {
  const hex = requireHex(value, label);
  if (hex.length !== 66) throw new Error(`${label} returned malformed data`);
  return BigInt(hex);
}

export async function validateDeployment({ address, tx, request, rpc }) {
  const release = validateManifest(request);
  const registry = expectAddress(address, "deployment address");
  rejectPlaceholder(registry, "deployment address", 40);
  if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) throw new Error("transaction hash is invalid");
  rejectPlaceholder(tx, "transaction hash", 64);

  const chainId = Number(await rpc("eth_chainId", []));
  if (chainId !== ARC_CHAIN_ID) {
    throw new Error(`wrong chain: expected ${ARC_CHAIN_ID}, received ${chainId}`);
  }

  const receipt = await rpc("eth_getTransactionReceipt", [tx]);
  if (!receipt || receipt.status !== "0x1") throw new Error("deployment receipt is missing or failed");
  if (receipt.transactionHash?.toLowerCase() !== tx.toLowerCase()) {
    throw new Error("receipt transaction does not match the requested hash");
  }
  if (!receipt.contractAddress) throw new Error("receipt does not create a contract");
  if (expectAddress(receipt.contractAddress, "receipt address") !== registry) {
    throw new Error("deployment address does not match the receipt");
  }

  const transaction = await rpc("eth_getTransactionByHash", [tx]);
  if (!transaction || transaction.blockNumber == null || !transaction.blockHash) {
    throw new Error("deployment transaction is missing or unconfirmed");
  }
  if (transaction.hash?.toLowerCase() !== tx.toLowerCase()) {
    throw new Error("deployment transaction hash is inconsistent");
  }
  if (transaction.to !== null) throw new Error("deployment transaction must create a contract");
  if (requireHex(transaction.input, "deployment input") !== release.bytecode.creationData) {
    throw new Error("deployment input does not match the signed request");
  }
  const deployer = expectAddress(transaction.from, "deployer");
  rejectPlaceholder(deployer, "deployer", 40);
  if (!/^0x[0-9a-fA-F]{64}$/.test(transaction.blockHash)) {
    throw new Error("transaction block hash is invalid");
  }
  rejectPlaceholder(transaction.blockHash, "block hash", 64);
  if (receipt.from && expectAddress(receipt.from, "receipt deployer") !== deployer) {
    throw new Error("transaction and receipt deployers differ");
  }
  if (
    transaction.blockNumber !== receipt.blockNumber ||
    transaction.blockHash.toLowerCase() !== receipt.blockHash?.toLowerCase()
  ) {
    throw new Error("transaction and receipt block evidence differ");
  }

  const runtime = requireHex(await rpc("eth_getCode", [registry, "latest"]), "deployed bytecode");
  if (runtime === "0x") throw new Error("deployed bytecode is empty");
  const expectedRuntime = materializeRuntimeBytecode(
    release.bytecode.runtimeTemplate,
    release.bytecode.immutableReferences,
    ARC_USDC,
  );
  if (runtime !== expectedRuntime.toLowerCase()) {
    throw new Error("deployed bytecode does not match the release artifact");
  }

  const usdcData = toFunctionSelector("usdc()");
  const decimalsData = toFunctionSelector("decimals()");
  const configuredUsdc = decodeAddress(
    await rpc("eth_call", [{ to: registry, data: usdcData }, "latest"]),
    "usdc()",
  );
  if (configuredUsdc !== getAddress(ARC_USDC)) throw new Error("registry USDC is incorrect");

  const decimals = decodeUint(
    await rpc("eth_call", [{ to: ARC_USDC, data: decimalsData }, "latest"]),
    "decimals()",
  );
  if (decimals !== 6n) throw new Error(`USDC decimals must be 6, received ${decimals}`);

  return {
    schemaVersion: 1,
    network: "arc-testnet",
    chainId: ARC_CHAIN_ID,
    rpcUrl: ARC_RPC_URL,
    explorerUrl: ARC_EXPLORER_URL,
    address: registry,
    transactionHash: tx.toLowerCase(),
    block: {
      number: Number.parseInt(receipt.blockNumber, 16),
      hash: receipt.blockHash,
    },
    deployer,
    constructor: { usdc: getAddress(ARC_USDC) },
    compiler: release.compiler,
    source: {
      commit: release.source.sourceCommit,
      target: release.source.target,
      standardJsonSha256: release.hashes.standardJsonSha256,
    },
    codeHashes: {
      deployed: keccak256(runtime),
      artifactTemplate: release.hashes.runtimeArtifactKeccak,
      creationData: release.hashes.creationDataKeccak,
    },
    request: {
      checksum: request.manifestChecksum,
      creationDataBytes: release.bytecode.creationDataBytes,
    },
    validatedAt: new Date().toISOString(),
    verification: {
      bytecode: true,
      constructor: true,
      usdcDecimals: true,
      sourceCode: false,
    },
  };
}
