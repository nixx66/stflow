import assert from "node:assert/strict";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

type RouteHandler = (request: Request, context?: { params: Promise<{ invoiceId: string }> }) => Promise<Response>;

async function importRouteHandler(routePath: string, exportName: "POST" | "PATCH") {
  const directory = await mkdtemp(join(tmpdir(), "stflow-route-"));

  try {
    const source = await readFile(routePath, "utf8");
    const nextServerUrl = pathToFileURL(join(process.cwd(), "node_modules", "next", "server.js")).href;
    const storeUrl = pathToFileURL(join(process.cwd(), "lib", "serverInvoiceStore.ts")).href;
    const modulePath = join(directory, "route.ts");

    await writeFile(
      modulePath,
      source
        .replace('from "next/server"', `from "${nextServerUrl}"`)
        .replace('from "@/lib/serverInvoiceStore"', `from "${storeUrl}"`),
      "utf8"
    );

    return {
      handler: (await import(pathToFileURL(modulePath).href))[exportName] as RouteHandler,
      cleanup: () => rm(directory, { recursive: true, force: true })
    };
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

test("removes its temporary route directory when setup fails", async () => {
  const existingDirectories = new Set(
    (await readdir(tmpdir())).filter((entry) => entry.startsWith("stflow-route-"))
  );

  await assert.rejects(() => importRouteHandler("missing-route.ts", "POST"));

  const remainingDirectories = (await readdir(tmpdir())).filter((entry) => entry.startsWith("stflow-route-"));
  assert.deepEqual(remainingDirectories, [...existingDirectories]);
});

test("POST returns the invoice payload error for malformed JSON", async () => {
  const { handler: POST, cleanup } = await importRouteHandler("app/api/invoices/route.ts", "POST");

  try {
    const response = await POST(
      new Request("http://localhost/api/invoices", {
        method: "POST",
        body: "not-json"
      })
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid invoice payload" });
  } finally {
    await cleanup();
  }
});

test("PATCH returns the invoice payload error for malformed JSON", async () => {
  const { handler: PATCH, cleanup } = await importRouteHandler("app/api/invoices/[invoiceId]/route.ts", "PATCH");

  try {
    const response = await PATCH(
      new Request("http://localhost/api/invoices/af-1001", {
        method: "PATCH",
        body: "not-json"
      }),
      { params: Promise.resolve({ invoiceId: "af-1001" }) }
    );

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: "Invalid invoice payload" });
  } finally {
    await cleanup();
  }
});
