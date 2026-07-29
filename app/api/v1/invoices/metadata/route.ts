import { NextResponse } from "next/server";
import { createPublicClient, http, isAddress } from "viem";
import { arcTestnet } from "@/lib/chains";
import { getInvoiceMetadataRepository } from "@/lib/server/invoiceMetadataRepository";
import {
  MetadataConflictError,
  MetadataValidationError,
  persistSignedInvoiceMetadata
} from "@/lib/server/verifyInvoiceCreation";
import { getServerRuntimeConfig, RuntimeConfigError } from "@/lib/server/runtimeConfig";
import { WalletAuthError } from "@/lib/server/walletAuth";
import { readBoundedJson, RequestBodyError } from "@/lib/server/internal/readBoundedJson";
import {
  ClientIdentityError,
  enforceMetadataRateLimit,
  RateLimitError
} from "@/lib/server/metadataRateLimit";
import {
  RepositoryAuthError,
  RepositoryConflictError,
  RepositoryError
} from "@/lib/server/invoiceMetadataRepository";

const MAX_BODY_BYTES = 96 * 1024;
class ArcRpcError extends Error {}

function walletFromChallenge(challenge: unknown) {
  if (typeof challenge !== "string") throw new MetadataValidationError("Invalid challenge.");
  const line = challenge.split("\n").find((part) => part.startsWith("Wallet: "));
  if (!line) throw new MetadataValidationError("Invalid challenge.");
  const wallet = line.slice(8);
  if (!isAddress(wallet, { strict: false })) {
    throw new MetadataValidationError("Invalid challenge.");
  }
  return wallet;
}

export async function POST(request: Request) {
  try {
    const config = getServerRuntimeConfig();
    const client = createPublicClient({
      chain: arcTestnet,
      transport: http(config.rpcUrl)
    });
    const body = await readBoundedJson(request, MAX_BODY_BYTES) as
      Parameters<typeof persistSignedInvoiceMetadata>[0];
    await enforceMetadataRateLimit(
      request,
      "persist:create_invoice:v1",
      walletFromChallenge(body.challenge),
      { wallet: 10, client: 30 }
    );
    const result = await persistSignedInvoiceMetadata(body, {
      repository: getInvoiceMetadataRepository(),
      config: {
        chainId: config.chainId,
        registry: config.invoiceRegistryAddress,
        rpcUrl: config.rpcUrl
      },
      rpc: {
        async getReceipt({ hash }) {
          try {
            return await client.getTransactionReceipt({ hash });
          } catch {
            throw new ArcRpcError();
          }
        },
        async getBlock({ blockNumber }) {
          try {
            return await client.getBlock({ blockNumber });
          } catch {
            throw new ArcRpcError();
          }
        }
      }
    });
    return NextResponse.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    if (error instanceof RuntimeConfigError) {
      return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
    }
    if (error instanceof MetadataConflictError || error instanceof RepositoryConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof WalletAuthError || error instanceof RepositoryAuthError) {
      return NextResponse.json({ error: "Wallet authorization failed." }, { status: 401 });
    }
    if (error instanceof MetadataValidationError || error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof ClientIdentityError || error instanceof RepositoryError) {
      return NextResponse.json({ error: "Metadata service unavailable." }, { status: 503 });
    }
    if (error instanceof ArcRpcError) {
      return NextResponse.json({ error: "Arc RPC unavailable." }, { status: 502 });
    }
    return NextResponse.json({ error: "Metadata service unavailable." }, { status: 503 });
  }
}
