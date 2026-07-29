import { access } from "node:fs/promises";
import { spawn, spawnSync } from "node:child_process";

const forge = await findBinary("FORGE_BIN", "forge");

await run(forge, ["build"]);
await run(process.execPath, ["--no-warnings", "--test", "tests/arcInvoice.integration.test.ts"], {
  ...process.env,
  STFLOW_INTEGRATION: "1",
});

async function findBinary(variable, command) {
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

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: "inherit",
      windowsHide: true,
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${command} ${args.join(" ")} failed${signal ? ` with ${signal}` : ` with exit code ${code}`}.`,
        ),
      );
    });
  });
}
