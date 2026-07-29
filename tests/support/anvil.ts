import {
  spawn,
  spawnSync,
  type ChildProcess,
  type SpawnOptions,
} from "node:child_process";
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

type AttemptResult = {
  rpcUrl: string;
  stop: () => Promise<void>;
};

export type AnvilAttempt = (input: {
  executable: string;
  port: number;
}) => Promise<AttemptResult>;

type StartOptions = {
  executable?: string;
  nextPort?: () => Promise<number>;
  launch?: AnvilAttempt;
};

const localChain = defineChain({
  id: 31_337,
  name: "Anvil",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["http://127.0.0.1"] } },
});

export class AnvilStartError extends Error {
  readonly kind: "bind" | "fatal";

  constructor(kind: "bind" | "fatal", message: string) {
    super(message);
    this.name = "AnvilStartError";
    this.kind = kind;
  }
}

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

export async function startAnvil(options: StartOptions = {}) {
  const executable =
    options.executable ?? (await findBinary("ANVIL_BIN", "anvil"));
  const nextPort = options.nextPort ?? availablePort;
  const launch = options.launch ?? launchAnvil;
  let lastBindError: Error | undefined;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const port = await nextPort();
    try {
      const started = await launch({ executable, port });
      let stopping: Promise<void> | undefined;
      return {
        rpcUrl: started.rpcUrl,
        public: (transport: Transport) =>
          createPublicClient({ chain: localChain, transport }),
        wallet: (account: Account, transport: Transport) =>
          createWalletClient({ account, chain: localChain, transport }),
        stop: () => (stopping ??= started.stop()),
      };
    } catch (error) {
      if (!(error instanceof AnvilStartError) || error.kind !== "bind") throw error;
      lastBindError = error;
    }
  }

  throw new Error(
    `Anvil could not bind to an available local port after 5 attempts. ${lastBindError?.message ?? ""}`.trim(),
  );
}

async function launchAnvil({
  executable,
  port,
}: {
  executable: string;
  port: number;
}): Promise<AttemptResult> {
  const rpcUrl = `http://127.0.0.1:${port}`;
  const output: Buffer[] = [];
  let spawnError: Error | undefined;
  const child = spawn(
    executable,
    ["--host", "127.0.0.1", "--port", String(port), "--chain-id", "31337", "--silent"],
    childOptions(),
  );
  child.stdout?.on("data", (chunk: Buffer) => output.push(chunk));
  child.stderr?.on("data", (chunk: Buffer) => output.push(chunk));
  child.once("error", (error) => {
    spawnError = error;
  });
  const cleanup = manageChild(child);

  try {
    await waitForRpc(child, rpcUrl, output, () => spawnError);
  } catch (error) {
    await cleanup();
    throw error;
  }

  return { rpcUrl, stop: cleanup };
}

function childOptions(): SpawnOptions {
  return {
    detached: process.platform !== "win32",
    env: allowedEnvironment(["ANVIL_BIN"]),
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  };
}

function allowedEnvironment(extra: string[] = []) {
  const names = [
    "PATH",
    "Path",
    "SystemRoot",
    "SYSTEMROOT",
    "TEMP",
    "TMP",
    "TMPDIR",
    "CI",
    "NODE_ENV",
    ...extra,
  ];
  const env = {} as NodeJS.ProcessEnv;
  for (const name of names) {
    if (process.env[name] !== undefined) env[name] = process.env[name];
  }
  return env;
}

async function findBinary(variable: string, command: string) {
  const configured = process.env[variable];
  if (configured) {
    await access(configured);
    return configured;
  }

  const locator = process.platform === "win32" ? "where.exe" : "which";
  const result = spawnSync(locator, [command], {
    encoding: "utf8",
    env: allowedEnvironment(),
    windowsHide: true,
  });
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

async function waitForRpc(
  child: ChildProcess,
  rpcUrl: string,
  output: Buffer[],
  getSpawnError: () => Error | undefined,
) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    const spawnError = getSpawnError();
    if (spawnError) throw new AnvilStartError("fatal", spawnError.message);
    if (child.exitCode !== null) {
      const detail = Buffer.concat(output).toString("utf8").trim();
      const kind = isBindFailure(detail) ? "bind" : "fatal";
      throw new AnvilStartError(
        kind,
        `Anvil exited before becoming ready.${detail ? ` ${detail}` : ""}`,
      );
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
      // The socket is unavailable until Anvil finishes startup.
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 50));
  }

  throw new AnvilStartError(
    "fatal",
    `Anvil did not become ready at ${rpcUrl} within 10 seconds.`,
  );
}

function isBindFailure(output: string) {
  return /address already in use|eaddrinuse|os error 10048|cannot assign requested address/iu.test(
    output,
  );
}

function manageChild(child: ChildProcess) {
  let stopping: Promise<void> | undefined;
  const onSignal = (signal: "SIGINT" | "SIGTERM") => {
    void stop().finally(() => {
      process.removeListener(signal, signal === "SIGINT" ? onSigint : onSigterm);
      process.kill(process.pid, signal);
    });
  };
  const onSigint = () => onSignal("SIGINT");
  const onSigterm = () => onSignal("SIGTERM");
  const onExit = () => forceTerminateSync(child);

  process.once("SIGINT", onSigint);
  process.once("SIGTERM", onSigterm);
  process.once("exit", onExit);

  const removeHooks = () => {
    process.removeListener("SIGINT", onSigint);
    process.removeListener("SIGTERM", onSigterm);
    process.removeListener("exit", onExit);
  };
  const stop = () =>
    (stopping ??= (async () => {
      removeHooks();
      if (hasExited(child)) return;

      terminate(child, false);
      if (await waitForExit(child, 2_000)) return;

      terminate(child, true);
      if (!(await waitForExit(child, 2_000))) {
        throw new Error(`Anvil process ${child.pid ?? "unknown"} did not terminate.`);
      }
    })());

  return stop;
}

function terminate(child: ChildProcess, force: boolean) {
  if (!child.pid || hasExited(child)) return;
  if (process.platform === "win32") {
    const result = spawnSync(
      "taskkill.exe",
      ["/PID", String(child.pid), "/T", ...(force ? ["/F"] : [])],
      {
        env: allowedEnvironment(),
        stdio: "ignore",
        windowsHide: true,
      },
    );
    if (result.status !== 0 && !hasExited(child)) {
      child.kill(force ? "SIGKILL" : "SIGTERM");
    }
    return;
  }

  try {
    process.kill(-child.pid, force ? "SIGKILL" : "SIGTERM");
  } catch {
    child.kill(force ? "SIGKILL" : "SIGTERM");
  }
}

function forceTerminateSync(child: ChildProcess) {
  if (!child.pid || hasExited(child)) return;
  terminate(child, true);
}

function hasExited(child: ChildProcess) {
  return child.exitCode !== null || child.signalCode !== null;
}

async function waitForExit(child: ChildProcess, timeout: number) {
  if (hasExited(child)) return true;
  return new Promise<boolean>((resolveExit) => {
    const timer = setTimeout(() => {
      child.removeListener("exit", onChildExit);
      resolveExit(false);
    }, timeout);
    timer.unref();
    const onChildExit = () => {
      clearTimeout(timer);
      resolveExit(true);
    };
    child.once("exit", onChildExit);
  });
}
