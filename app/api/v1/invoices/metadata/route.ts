import { NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { arcTestnet } from "@/lib/chains";
import { getInvoiceMetadataRepository } from "@/lib/server/invoiceMetadataRepository";
import {
  MetadataConflictError,
  MetadataValidationError,
  persistSignedInvoiceMetadata
} from "@/lib/server/verifyInvoiceCreation";
import { getServerRuntimeConfig, RuntimeConfigError } from "@/lib/server/runtimeConfig";
import { WalletAuthError } from "@/lib/server/walletAuth";

const MAX_BODY_BYTES = 96 * 1024;

async function readBody(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) throw new MetadataValidationError("Request too large.");
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
    throw new MetadataValidationError("Request too large.");
  }
  try {
    return JSON.parse(text) as Parameters<typeof persistSignedInvoiceMetadata>[0];
  } catch {
    throw new MetadataValidationError("Invalid JSON.");
  }
}

export async function POST(request: Request) {
  try {
    const config = getServerRuntimeConfig();
    const client = createPublicClient({
      chain: arcTestnet,
      transport: http(config.rpcUrl)
    });
    const result = await persistSignedInvoiceMetadata(await readBody(request), {
      repository: getInvoiceMetadataRepository(),
      config: {
        chainId: config.chainId,
        registry: config.invoiceRegistryAddress,
        rpcUrl: config.rpcUrl
      },
      rpc: {
        getReceipt: ({ hash }) => client.getTransactionReceipt({ hash }),
        getBlock: ({ blockNumber }) => client.getBlock({ blockNumber })
      }
    });
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    if (error instanceof RuntimeConfigError) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }
    if (error instanceof WalletAuthError) {
      return NextResponse.json({ error: "Wallet authorization failed." }, { status: 401 });
    }
    if (error instanceof MetadataConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof MetadataValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (
      error instanceof Error &&
      /receipt|transport|http|rpc|timeout|network/i.test(error.message)
    ) {
      return NextResponse.json({ error: "Arc RPC unavailable." }, { status: 502 });
    }
    return NextResponse.json({ error: "Metadata service unavailable." }, { status: 503 });
  }
}
