import { NextResponse } from "next/server";
import { getServerRuntimeConfig, RuntimeConfigError } from "../../../../lib/server/runtimeConfig.ts";
import { getSupabaseAdmin } from "../../../../lib/server/supabase.ts";
import {
  ReorgError,
  SyncConfigError,
  SyncDatabaseError,
  authorizeCron,
  createSyncDependencies,
  parseSyncConfig,
  syncInvoiceEvents
} from "../../../../lib/server/syncInvoiceEvents.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function run(request: Request) {
  let syncConfig;
  let runtimeConfig;
  try {
    syncConfig = parseSyncConfig(process.env);
    runtimeConfig = getServerRuntimeConfig();
  } catch (error) {
    if (error instanceof SyncConfigError || error instanceof RuntimeConfigError) {
      return NextResponse.json(
        { error: "Chain synchronization is not configured." },
        { status: 503 }
      );
    }
    throw error;
  }

  if (!authorizeCron(request.headers.get("authorization"), syncConfig.cronSecret)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await syncInvoiceEvents(
      {
        deploymentBlock: syncConfig.deploymentBlock,
        confirmationDepth: syncConfig.confirmationDepth
      },
      createSyncDependencies(
        runtimeConfig.invoiceRegistryAddress,
        getSupabaseAdmin()
      )
    );
    return NextResponse.json({
      processed: result.processed,
      fromBlock: result.fromBlock?.toString() ?? null,
      toBlock: result.toBlock?.toString() ?? null
    });
  } catch (error) {
    if (error instanceof ReorgError) {
      return NextResponse.json(
        { error: "Chain cursor conflict. Operator recovery is required." },
        { status: 409 }
      );
    }
    if (error instanceof SyncDatabaseError) {
      return NextResponse.json(
        { error: "Chain index database is unavailable." },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { error: "Arc RPC synchronization failed." },
      { status: 502 }
    );
  }
}

export const GET = run;
export const POST = run;
