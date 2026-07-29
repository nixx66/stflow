import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { access, readFile } from "node:fs/promises";
import { createServer } from "node:net";
import { resolve } from "node:path";

import {
  createPublicClient,
  createWalletClient,
  defineChain,
  type Abi,
  type Account,
  type Hex,
  type Transport,
} from "viem";

type Artifact = {
  abi: Abi;
  bytecode: Hex;
};

const localChain = defineChain({
  id: 31_337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1"] } },
});

export async function loadArtifact(path: string): Promise<Artifact> {
  const artifact = JSON.parse(await readFile(resolve(path), "utf8")) as {
    abi?: Abi;
    bytecode?: { object?: string };
  };
  const object = artifact.bytecode?.object;

  if (!artifact.abi || !object) {
    throw new Error(`Incomplete Foundry artifact: ${path}. Run forge build first.`);
  }

  return {
    abi: artifact.abi,
    bytecode: (object.startsWith("0x") ? object : `0x${object}`) as Hex,
  };
}

export async function startAnvil() {
  const executable = await findBinary("ANVIL_BIN", "anvil");
  const port = await availablePort();
  const rpcUrl = `http://127.0.0.1:${port}`;
  const process = spawn(
    executable,
    ["--host", "127.0.0.1", "--port", String(port), "--chain-id", "31337", "--silent"],
    { stdio: ["ignore", "pipe", "pipe"], windowsHide: true },
  );
  const output: Buffer[] = [];
  process.stderr?.on("data", (chunk: Buffer) => output.push(chunk));

  try {
    await waitForRpc(process, rpcUrl, output);
  } catch (error) {
    await stop(process);
    throw error;
  }

  return {
    rpcUrl,
    public: (transport: Transport) =>
      createPublicClient({ chain: localChain, transport }),
    wallet: (account: Account, transport: Transport) =>
      createWalletClient({ account, chain: localChain, transport }),
    stop: () => stop(process),
  };
}

async function findBinary(variable: string, command: string) {
  const configured = process.env[variable];
  if (configured) {
    await access(configured);
    return configured;
  }

  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(locator, [command], { encoding: "utf8", windowsHide: true });
  const executable = result.stdout?.split(/\r?\n/u).find(Boolean);
  if (result.status === 0 && executable) return executable;

  throw new Error(
    `${command} was not found. Install Foundry or set ${variable} to its executable path.`,
  );
}

async function availablePort() {
  return new Promise<number>((resolvePort, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate an Anvil port."));
        return;
      }
      server.close((error) => (error ? reject(error) : resolvePort(address.port)));
    });
  });
}

async function waitForRpc(process: ChildProcess, rpcUrl: string, output: Buffer[]) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (process.exitCode !== null) {
      const detail = Buffer.concat(output).toString("utf8").trim();
      throw new Error(`Anvil exited before becoming ready.${detail ? ` ${detail}` : ""}`);
    }

    try {
      const response = await fetch(rpcUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}',
        signal: AbortSignal.timeout(500),
      });
      const body = (await response.json()) as { result?: string };
      if (response.ok && body.result === "0x7a69") return;
    } catch {
      // The child may need several polling intervals before its socket is ready.
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }

  throw new Error(`Anvil did not become ready at ${rpcUrl} within 10 seconds.`);
}

async function stop(process: ChildProcess) {
  if (process.exitCode !== null) return;
  process.kill();
  await Promise.race([
    new Promise<void>((resolveExit) => process.once("exit", () => resolveExit())),
    new Promise<void>((resolveWait) => setTimeout(resolveWait, 2_000)),
  ]);
  if (process.exitCode === null) process.kill("SIGKILL");
}
