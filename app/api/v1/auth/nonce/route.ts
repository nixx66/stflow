import { NextResponse } from "next/server";
import { issueInvoiceNonce } from "@/lib/server/internal/invoiceNonce";
import { MetadataValidationError } from "@/lib/server/internal/signedInvoiceMetadata";
import { getServerRuntimeConfig, RuntimeConfigError } from "@/lib/server/runtimeConfig";
import { getSupabaseAdmin } from "@/lib/server/supabase";
import { readBoundedJson, RequestBodyError } from "@/lib/server/internal/readBoundedJson";
import {
  ClientIdentityError,
  enforceMetadataRateLimit,
  RateLimitError
} from "@/lib/server/metadataRateLimit";

const MAX_BODY_BYTES = 96 * 1024;

export async function POST(request: Request) {
  try {
    const config = getServerRuntimeConfig();
    const db = getSupabaseAdmin();
    const payload = await readBoundedJson(request, MAX_BODY_BYTES) as
      Parameters<typeof issueInvoiceNonce>[0];
    await enforceMetadataRateLimit(request, "nonce:create_invoice:v1", payload.wallet, 5);
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
    if (error instanceof MetadataValidationError || error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof ClientIdentityError) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }
    return NextResponse.json({ error: "Metadata service unavailable." }, { status: 503 });
  }
}
