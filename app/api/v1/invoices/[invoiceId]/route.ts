import { NextResponse } from "next/server";
import { getInvoiceMetadataRepository } from "@/lib/server/invoiceMetadataRepository";
import {
  getInvoiceMetadata,
  MetadataValidationError
} from "@/lib/server/verifyInvoiceCreation";
import { getServerRuntimeConfig, RuntimeConfigError } from "@/lib/server/runtimeConfig";

export async function GET(
  _request: Request,
  context: { params: Promise<{ invoiceId: string }> }
) {
  try {
    const config = getServerRuntimeConfig();
    const { invoiceId } = await context.params;
    const result = await getInvoiceMetadata(invoiceId, {
      repository: getInvoiceMetadataRepository(),
      config: {
        chainId: config.chainId,
        registry: config.invoiceRegistryAddress
      }
    });
    if (!result) {
      return NextResponse.json({ error: "Invoice metadata not found." }, { status: 404 });
    }
    return NextResponse.json({
      invoiceId: result.invoiceId,
      metadataHash: result.metadataHash,
      metadata: {
        customerName: result.customerName,
        title: result.title,
        description: result.description,
        memo: result.memo
      }
    });
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
