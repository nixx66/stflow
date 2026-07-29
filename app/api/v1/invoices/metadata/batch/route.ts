import { NextResponse } from "next/server";
import { parseMetadataBatchRequest } from "@/lib/server/internal/invoiceMetadataBatch";
import { readBoundedJson } from "@/lib/server/internal/readBoundedJson";
import {
  getInvoiceMetadataRepository,
  RepositoryError
} from "@/lib/server/invoiceMetadataRepository";
import { getServerRuntimeConfig, RuntimeConfigError } from "@/lib/server/runtimeConfig";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const ids = parseMetadataBatchRequest(await readBoundedJson(request, 16_384));
    const config = getServerRuntimeConfig();
    const repository = getInvoiceMetadataRepository();
    const rows = await repository.findMany({
      chainId: config.chainId,
      registry: config.invoiceRegistryAddress,
      invoiceIds: ids
    });
    return NextResponse.json({
      metadata: rows.map((row) => ({
        invoiceId: row.invoice_id,
        metadataHash: row.metadata_hash,
        metadata: {
          customerName: row.customer_name,
          title: row.title,
          description: row.description,
          memo: row.memo
        }
      }))
    });
  } catch (error) {
    if (error instanceof RuntimeConfigError || error instanceof RepositoryError) {
      return NextResponse.json({ error: "Metadata service unavailable." }, { status: 503 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid request." },
      { status: 400 }
    );
  }
}
