import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { keccak256, encodeDeployData, getAddress, toFunctionSelector } from "viem";

export const ARC_CHAIN_ID = 5_042_002;
export const ARC_RPC_URL = "https://rpc.testnet.arc.network";
export const ARC_EXPLORER_URL = "https://testnet.arcscan.app";
export const ARC_USDC = "0x3600000000000000000000000000000000000000";

const hexPattern = /^0x[0-9a-fA-F]*$/;

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

export function buildDeploymentRequest({ artifact, buildInfo, commit }) {
  constructorAbi(artifact);
  const bytecode = requireHex(artifact.bytecode?.object, "creation bytecode");
  const runtime = requireHex(artifact.deployedBytecode?.object, "runtime bytecode");
  if (bytecode === "0x" || runtime === "0x") throw new Error("contract bytecode is empty");
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error("source commit must be a full SHA");
  if (
    buildInfo?.language !== "Solidity" ||
    !Object.values(buildInfo.source_id_to_path ?? {}).includes(
      "contracts/src/STFlowInvoiceRegistry.sol",
    )
  ) {
    throw new Error("build info does not contain the registry source");
  }

  const creationData = encodeDeployData({
    abi: artifact.abi,
    bytecode,
    args: [ARC_USDC],
  });
  const metadata = artifact.metadata;

  if (
    metadata?.compiler?.version !== "0.8.30+commit.73712a01" ||
    metadata?.settings?.optimizer?.enabled !== true ||
    metadata?.settings?.optimizer?.runs !== 200
  ) {
    throw new Error("artifact compiler settings do not match the release profile");
  }

  return {
    status: "NOT_DEPLOYED",
    chainId: ARC_CHAIN_ID,
    rpcUrl: ARC_RPC_URL,
    explorerUrl: ARC_EXPLORER_URL,
    contract: "STFlowInvoiceRegistry",
    constructor: { usdc: ARC_USDC },
    creationData,
    compiler: {
      version: metadata.compiler.version,
      optimizer: metadata.settings.optimizer,
    },
    source: {
      commit,
      target: metadata.settings.compilationTarget,
      buildInfoId: buildInfo.id,
    },
    checksums: {
      creationDataKeccak: keccak256(creationData),
      runtimeArtifactKeccak: keccak256(runtime),
    },
  };
}

export async function buildStandardJsonInput({ artifact, readSource }) {
  const metadata = artifact.metadata;
  const sources = {};

  for (const path of Object.keys(metadata.sources ?? {}).sort()) {
    sources[path] = { content: await readSource(path) };
  }

  const {
    compilationTarget: _target,
    libraries,
    metadata: metadataSettings,
    optimizer,
    remappings,
    evmVersion,
  } = metadata.settings;

  return {
    language: metadata.language,
    sources,
    settings: {
      optimizer,
      ...(evmVersion ? { evmVersion } : {}),
      ...(remappings ? { remappings } : {}),
      ...(libraries ? { libraries } : {}),
      ...(metadataSettings ? { metadata: metadataSettings } : {}),
      outputSelection: {
        "*": { "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "metadata"] },
      },
    },
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

function decodeAddress(value, label) {
  const hex = requireHex(value, label);
  if (hex.length !== 66) throw new Error(`${label} returned malformed data`);
  return expectAddress(`0x${hex.slice(-40)}`, label);
}

function decodeUint(value, label) {
  const hex = requireHex(value, label);
  if (hex === "0x") throw new Error(`${label} returned no data`);
  return BigInt(hex);
}

export async function validateDeployment({ address, tx, artifact, commit, rpc }) {
  const registry = expectAddress(address, "deployment address");
  if (/^0x0{40}$/i.test(registry)) throw new Error("deployment address is a placeholder");
  if (!/^0x[0-9a-fA-F]{64}$/.test(tx)) throw new Error("transaction hash is invalid");
  if (/^0x0{64}$/i.test(tx)) throw new Error("transaction hash is a placeholder");

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
  if (!transaction || transaction.blockNumber == null) {
    throw new Error("deployment transaction is missing or unconfirmed");
  }

  const runtime = requireHex(await rpc("eth_getCode", [registry, "latest"]), "deployed bytecode");
  if (runtime === "0x") throw new Error("deployed bytecode is empty");
  const expectedRuntime = materializeRuntimeBytecode(
    artifact.deployedBytecode.object,
    artifact.deployedBytecode.immutableReferences,
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

  const request = buildDeploymentRequest({
    artifact,
    buildInfo: {
      id: "validated-from-artifact",
      language: "Solidity",
      source_id_to_path: { "0": "contracts/src/STFlowInvoiceRegistry.sol" },
    },
    commit,
  });

  return {
    network: "arc-testnet",
    chainId: ARC_CHAIN_ID,
    address: registry,
    transactionHash: tx.toLowerCase(),
    block: {
      number: Number.parseInt(receipt.blockNumber, 16),
      hash: receipt.blockHash,
    },
    deployer: expectAddress(receipt.from ?? transaction.from, "deployer"),
    constructor: { usdc: getAddress(ARC_USDC) },
    compiler: request.compiler,
    source: { commit },
    codeHashes: {
      deployed: keccak256(runtime),
      artifactTemplate: request.checksums.runtimeArtifactKeccak,
    },
    verification: {
      bytecode: true,
      constructor: true,
      usdcDecimals: true,
      sourceCode: false,
    },
  };
}
