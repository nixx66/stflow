import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDeploymentRequest, buildStandardJsonInput } from "./arcDeployment.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const artifactPath = resolve(
  root,
  "contracts/out/STFlowInvoiceRegistry.sol/STFlowInvoiceRegistry.json",
);
const buildInfoDir = resolve(root, "contracts/out/build-info");
const outputDir = resolve(root, ".stflow-deployment");

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

async function loadBuildInfo() {
  const names = (await readdir(buildInfoDir)).filter((name) => name.endsWith(".json")).sort();
  for (const name of names) {
    const info = JSON.parse(await readFile(resolve(buildInfoDir, name), "utf8"));
    if (
      Object.values(info.source_id_to_path ?? {}).includes(
        "contracts/src/STFlowInvoiceRegistry.sol",
      )
    ) {
      return info;
    }
  }
  throw new Error("registry build info was not found; run forge build first");
}

async function main() {
  const allowDirty = process.argv.includes("--allow-dirty-for-test");
  const dirty = git("status", "--porcelain", "--untracked-files=no");
  if (dirty && !allowDirty) {
    throw new Error("tracked files are dirty; commit the exact release source before preparing");
  }

  const artifact = JSON.parse(await readFile(artifactPath, "utf8"));
  const buildInfo = await loadBuildInfo();
  const commit = git("rev-parse", "HEAD");
  const request = buildDeploymentRequest({ artifact, buildInfo, commit });
  const standardInput = await buildStandardJsonInput({
    artifact,
    readSource: (path) => readFile(resolve(root, path), "utf8"),
  });
  const standardJson = `${JSON.stringify(standardInput, null, 2)}\n`;
  const standardInputSha256 = createHash("sha256").update(standardJson).digest("hex");

  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, "standard-input.json"), standardJson);
  const completeRequest = {
    ...request,
    sourceVerification: {
      format: "Solidity standard JSON input",
      file: ".stflow-deployment/standard-input.json",
      sha256: standardInputSha256,
    },
  };
  await writeFile(
    resolve(outputDir, "arc-testnet-request.json"),
    `${JSON.stringify(completeRequest, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(completeRequest, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
