import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import test from "node:test";
import {
  assertCleanStatus,
  selectUnique,
  standardInputFromBuild,
  validateBuildProvenance,
} from "../scripts/arcReleaseBuild.mjs";

const source = "contract Registry {}\n";
const sourcePath = "contracts/src/STFlowInvoiceRegistry.sol";
const init = "6000";
const runtime = "6001";
const buildInfo = {
  solcVersion: "0.8.30",
  input: {
    language: "Solidity",
    sources: { [sourcePath]: { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      evmVersion: "osaka",
      metadata: { bytecodeHash: "ipfs", appendCBOR: true },
      viaIR: false,
      remappings: [],
      libraries: {},
    },
  },
  output: {
    contracts: {
      [sourcePath]: {
        STFlowInvoiceRegistry: {
          evm: {
            bytecode: { object: init },
            deployedBytecode: { object: runtime },
          },
        },
      },
    },
  },
};
const artifact = {
  bytecode: { object: `0x${init}` },
  deployedBytecode: { object: `0x${runtime}` },
  metadata: {
    sources: {
      [sourcePath]: {
        keccak256: "0xfd19b739bcfd954933c052103faeae8bd04b7f0d45e4b25cc80dea56fc813d0e",
      },
    },
  },
};

test("repository cleanliness rejects tracked and untracked files", () => {
  assert.doesNotThrow(() => assertCleanStatus(""));
  assert.throws(() => assertCleanStatus(" M package.json\n"), /clean/i);
  assert.throws(() => assertCleanStatus("?? .superpowers/\n"), /clean/i);
});

test("candidate selection rejects stale or ambiguous build outputs", () => {
  assert.equal(selectUnique(["one"], "build info"), "one");
  assert.throws(() => selectUnique([], "build info"), /one build info/i);
  assert.throws(() => selectUnique(["one", "two"], "build info"), /one build info/i);
});

test("standard input uses committed blobs instead of CRLF worktree content", async () => {
  const input = await standardInputFromBuild({
    buildInfo,
    readCommitBlob: async () => source,
  });

  assert.equal(input.sources[sourcePath].content, source);
  assert.notEqual(input.sources[sourcePath].content, source.replaceAll("\n", "\r\n"));
  assert.deepEqual(input.settings, buildInfo.input.settings);
});

test("provenance rejects source and bytecode drift", async () => {
  await assert.doesNotReject(
    validateBuildProvenance({
      artifact,
      buildInfo,
      readCommitBlob: async () => source,
      tracked: new Set([sourcePath]),
    }),
  );
  await assert.rejects(
    validateBuildProvenance({
      artifact,
      buildInfo,
      readCommitBlob: async () => `${source}// stale`,
      tracked: new Set([sourcePath]),
    }),
    /source/i,
  );
  await assert.rejects(
    validateBuildProvenance({
      artifact: { ...artifact, bytecode: { object: "0x6002" } },
      buildInfo,
      readCommitBlob: async () => source,
      tracked: new Set([sourcePath]),
    }),
    /bytecode/i,
  );
});

test(
  "rebuilds the current commit from archived Git blobs",
  { skip: !process.env.FORGE_BIN },
  async () => {
    const root = resolve(import.meta.dirname, "..");
    const commit = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: root,
      encoding: "utf8",
    }).trim();
    const { buildCommit } = await import("../scripts/arcReleaseBuild.mjs");
    const release = await buildCommit({ root, commit });

    assert.equal(release.buildInfo.solcVersion, "0.8.30");
    assert.equal(release.buildInfo.input.settings.optimizer.runs, 200);
    assert.ok(release.artifact.bytecode.object.length > 2);
    assert.equal(
      release.standardInput.sources[sourcePath].content,
      release.buildInfo.input.sources[sourcePath].content,
    );
  },
);
