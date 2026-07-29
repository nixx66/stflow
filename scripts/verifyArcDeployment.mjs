import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { keccak256, toHex } from "viem";
import {
  ARC_RPC_URL,
  buildDeploymentRequest,
  parseCliArgs,
  saveDeploymentRecord,
  validateDeployment,
  validateManifest,
} from "./arcDeployment.mjs";
import { buildCommit } from "./arcReleaseBuild.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

async function rpc(method, params) {
  const response = await fetch(ARC_RPC_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!response.ok) throw new Error(`Arc RPC returned HTTP ${response.status}`);
  const body = await response.json();
  if (body.error) throw new Error(`Arc RPC ${method} failed: ${body.error.message}`);
  return body.result;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sourceHashes(standardInput) {
  return Object.fromEntries(
    Object.entries(standardInput.sources).map(([path, { content }]) => [
      path,
      { sha256: sha256(content), keccak256: keccak256(toHex(content)) },
    ]),
  );
}

async function main() {
  const args = parseCliArgs(process.argv.slice(2), {
    "--address": { name: "address", required: true, flag: "--address" },
    "--tx": { name: "tx", required: true, flag: "--tx" },
    "--request": { name: "request", required: true, flag: "--request" },
    "--write": { name: "write", boolean: true, flag: "--write" },
  });
  const requestPath = isAbsolute(args.request) ? args.request : resolve(root, args.request);
  const request = JSON.parse(await readFile(requestPath, "utf8"));
  const release = validateManifest(request);
  const rebuilt = await buildCommit({ root, commit: release.source.sourceCommit });
  const standardJson = `${JSON.stringify(rebuilt.standardInput, null, 2)}\n`;
  const expected = buildDeploymentRequest({
    artifact: rebuilt.artifact,
    buildInfo: rebuilt.buildInfo,
    artifactJson: rebuilt.artifactJson,
    buildInfoJson: rebuilt.buildInfoJson,
    standardJson,
    commit: release.source.sourceCommit,
    sourceHashes: sourceHashes(rebuilt.standardInput),
  });
  if (JSON.stringify(expected) !== JSON.stringify(request)) {
    throw new Error("deployment request does not match its source commit rebuild");
  }

  const record = await validateDeployment({
    address: args.address,
    tx: args.tx,
    request,
    rpc,
  });
  const written = await saveDeploymentRecord({
    record,
    output: resolve(root, "contracts/deployment/arc-testnet.json"),
    write: args.write === true,
  });
  process.stdout.write(`${JSON.stringify({ ...record, written }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
