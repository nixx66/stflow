import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { keccak256, toHex } from "viem";

const contractPath = "contracts/src/STFlowInvoiceRegistry.sol";
const contractName = "STFlowInvoiceRegistry";

export function assertCleanStatus(status) {
  if (status.trim()) throw new Error("repository must be completely clean, including untracked files");
}

export function selectUnique(candidates, label) {
  if (candidates.length !== 1) throw new Error(`expected exactly one ${label}`);
  return candidates[0];
}

function normalizeHex(value) {
  return value.startsWith("0x") ? value.toLowerCase() : `0x${value.toLowerCase()}`;
}

export async function standardInputFromBuild({ buildInfo, readCommitBlob }) {
  const sources = {};
  for (const path of Object.keys(buildInfo.input.sources).sort()) {
    sources[path] = { content: await readCommitBlob(path) };
  }
  return {
    language: buildInfo.input.language,
    sources,
    settings: buildInfo.input.settings,
  };
}

export async function validateBuildProvenance({
  artifact,
  buildInfo,
  readCommitBlob,
  tracked,
}) {
  const sources = buildInfo.input?.sources ?? {};
  for (const [path, entry] of Object.entries(sources)) {
    if (!tracked.has(path)) throw new Error(`compiler source is not tracked: ${path}`);
    const committed = await readCommitBlob(path);
    if (entry.content !== committed) throw new Error(`compiler source differs from commit: ${path}`);
    const metadataHash = artifact.metadata?.sources?.[path]?.keccak256;
    if (metadataHash && keccak256(toHex(committed)) !== metadataHash.toLowerCase()) {
      throw new Error(`metadata source hash differs from commit: ${path}`);
    }
  }

  const output = buildInfo.output?.contracts?.[contractPath]?.[contractName]?.evm;
  if (!output) throw new Error("registry is missing from build-info output");
  if (
    normalizeHex(output.bytecode.object) !== normalizeHex(artifact.bytecode.object) ||
    normalizeHex(output.deployedBytecode.object) !==
      normalizeHex(artifact.deployedBytecode.object)
  ) {
    throw new Error("artifact bytecode differs from build-info output");
  }
}

function releaseBuildInfo(buildInfo) {
  return {
    id: buildInfo.id,
    solcVersion: buildInfo.solcVersion,
    solcLongVersion: buildInfo.solcLongVersion,
    language: buildInfo.language,
    input: {
      language: buildInfo.input.language,
      sources: buildInfo.input.sources,
      settings: buildInfo.input.settings,
    },
    output: buildInfo.output,
  };
}

function git(root, args, options = {}) {
  return execFileSync("git", args, { cwd: root, ...options });
}

function resolveForge() {
  if (process.env.FORGE_BIN) return process.env.FORGE_BIN;
  try {
    return execFileSync("where.exe", ["forge"], { encoding: "utf8" }).split(/\r?\n/)[0];
  } catch {
    throw new Error("forge was not found; install Foundry or set FORGE_BIN");
  }
}

export async function buildCommit({ root, commit }) {
  if (!/^[0-9a-f]{40}$/.test(commit)) throw new Error("commit must be a full SHA");
  git(root, ["cat-file", "-e", `${commit}^{commit}`]);

  const checkout = await mkdtemp(resolve(tmpdir(), "stflow-release-"));
  try {
    const archive = resolve(checkout, "source.tar");
    git(root, ["archive", "--format=tar", `--output=${archive}`, commit]);
    execFileSync("tar.exe", ["-xf", archive, "-C", checkout]);
    execFileSync(
      resolveForge(),
      ["build", "--root", checkout, "--force", "--build-info"],
      { cwd: checkout, stdio: "pipe" },
    );

    const buildInfoDir = resolve(checkout, "contracts/out/build-info");
    const buildInfoName = selectUnique(
      (await readdir(buildInfoDir)).filter((name) => name.endsWith(".json")),
      "build info",
    );
    const buildInfoPath = resolve(buildInfoDir, buildInfoName);
    const artifactPath = resolve(
      checkout,
      "contracts/out/STFlowInvoiceRegistry.sol/STFlowInvoiceRegistry.json",
    );
    const [rawBuildInfoJson, artifactJson] = await Promise.all([
      readFile(buildInfoPath, "utf8"),
      readFile(artifactPath, "utf8"),
    ]);
    const buildInfo = JSON.parse(rawBuildInfoJson);
    const artifact = JSON.parse(artifactJson);
    const tracked = new Set(
      git(root, ["ls-tree", "-r", "--name-only", commit], { encoding: "utf8" })
        .split(/\r?\n/)
        .filter(Boolean),
    );
    const readCommitBlob = (path) =>
      git(root, ["show", `${commit}:${path}`]).toString("utf8");

    await validateBuildProvenance({
      artifact,
      buildInfo,
      readCommitBlob,
      tracked,
    });
    const standardInput = await standardInputFromBuild({ buildInfo, readCommitBlob });

    return {
      artifact,
      artifactJson,
      buildInfo,
      buildInfoJson: JSON.stringify(releaseBuildInfo(buildInfo)),
      standardInput,
    };
  } finally {
    await rm(checkout, { recursive: true, force: true });
  }
}
