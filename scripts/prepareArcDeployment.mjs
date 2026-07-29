import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { keccak256, toHex } from "viem";
import { buildDeploymentRequest } from "./arcDeployment.mjs";
import { assertCleanStatus, buildCommit } from "./arcReleaseBuild.mjs";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = resolve(root, ".stflow-deployment");

function git(args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
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
  assertCleanStatus(git(["status", "--porcelain", "--untracked-files=all"]));
  const commit = git(["rev-parse", "HEAD"]);
  const first = await buildCommit({ root, commit });
  const replay = await buildCommit({ root, commit });
  const standardJson = `${JSON.stringify(first.standardInput, null, 2)}\n`;
  const replayStandardJson = `${JSON.stringify(replay.standardInput, null, 2)}\n`;

  if (
    standardJson !== replayStandardJson ||
    first.artifactJson !== replay.artifactJson ||
    first.buildInputJson !== replay.buildInputJson ||
    first.contractOutputJson !== replay.contractOutputJson ||
    first.artifact.bytecode.object !== replay.artifact.bytecode.object ||
    first.artifact.deployedBytecode.object !== replay.artifact.deployedBytecode.object
  ) {
    throw new Error("clean compiler replay was not deterministic");
  }

  const request = buildDeploymentRequest({
    artifact: first.artifact,
    buildInfo: first.buildInfo,
    artifactJson: first.artifactJson,
    buildInputJson: first.buildInputJson,
    contractOutputJson: first.contractOutputJson,
    standardJson,
    commit,
    sourceHashes: sourceHashes(first.standardInput),
  });

  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(resolve(outputDir, "standard-input.json"), standardJson),
    writeFile(
      resolve(outputDir, "arc-testnet-request.json"),
      `${JSON.stringify(request, null, 2)}\n`,
    ),
  ]);
  process.stdout.write(
    `${JSON.stringify({
      status: request.status,
      sourceCommit: request.source.sourceCommit,
      chainId: request.chainId,
      constructor: request.constructor,
      creationDataBytes: request.bytecode.creationDataBytes,
      creationDataKeccak: request.hashes.creationDataKeccak,
      standardJsonSha256: request.hashes.standardJsonSha256,
      manifestChecksum: request.manifestChecksum,
      output: ".stflow-deployment/arc-testnet-request.json",
    }, null, 2)}\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
