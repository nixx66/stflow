import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARC_RPC_URL,
  saveDeploymentRecord,
  validateDeployment,
} from "./arcDeployment.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));

function argument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1 || !process.argv[index + 1]) throw new Error(`${name} is required`);
  return process.argv[index + 1];
}

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

async function main() {
  const address = argument("--address");
  const tx = argument("--tx");
  const artifact = JSON.parse(
    await readFile(
      resolve(root, "contracts/out/STFlowInvoiceRegistry.sol/STFlowInvoiceRegistry.json"),
      "utf8",
    ),
  );
  const commit = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  const record = await validateDeployment({ address, tx, artifact, commit, rpc });
  const write = process.argv.includes("--write");
  await saveDeploymentRecord({
    record,
    output: resolve(root, "contracts/deployment/arc-testnet.json"),
    write,
  });

  process.stdout.write(`${JSON.stringify({ ...record, written: write }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
