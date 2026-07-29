import { NextResponse } from "next/server";
import { issueInvoiceNonce } from "@/lib/server/internal/invoiceNonce";
import { MetadataValidationError } from "@/lib/server/internal/signedInvoiceMetadata";
import { getServerRuntimeConfig, RuntimeConfigError } from "@/lib/server/runtimeConfig";
import { getSupabaseAdmin } from "@/lib/server/supabase";

const MAX_BODY_BYTES = 96 * 1024;

async function readBody(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new MetadataValidationError("Request too large.");
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    throw new MetadataValidationError("Request too large.");
  }
  try {
    return JSON.parse(text) as Parameters<typeof issueInvoiceNonce>[0];
  } catch {
    throw new MetadataValidationError("Invalid JSON.");
  }
}

export async function POST(request: Request) {
  try {
    const config = getServerRuntimeConfig();
    const db = getSupabaseAdmin();
    const payload = await readBody(request);
    const result = await issueInvoiceNonce(payload, {
      registry: config.invoiceRegistryAddress,
      async save(row) {
        const { error } = await db.from("wallet_nonces").insert(row);
        if (error) throw error;
      }
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof RuntimeConfigError) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }
    if (error instanceof MetadataValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Metadata service unavailable." }, { status: 503 });
  }
}
