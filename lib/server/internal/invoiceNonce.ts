import { randomBytes } from "node:crypto";
import { getAddress, isAddress, isHash, type Address, type Hex } from "viem";
import type { InvoiceMetadata } from "../../invoiceMetadata.ts";
import { metadataPayloadBinding, MetadataValidationError } from "./signedInvoiceMetadata.ts";
import { buildWalletChallenge, hashNonce } from "./walletAuth.ts";

export type InvoiceNonceRequest = {
  wallet: Address;
  action: "create_invoice";
  txHash: Hex;
  referenceId: Hex;
  metadata: InvoiceMetadata;
};

export async function issueInvoiceNonce(
  input: InvoiceNonceRequest,
  deps: {
    registry: Address;
    save(row: Record<string, string>): Promise<void>;
    now?: () => Date;
    randomNonce?: () => string;
  }
) {
  if (!isAddress(input.wallet, { strict: false })) {
    throw new MetadataValidationError("Invalid wallet.");
  }
  if (input.action !== "create_invoice") {
    throw new MetadataValidationError("Unsupported action.");
  }
  if (!isHash(input.txHash) || !isHash(input.referenceId)) {
    throw new MetadataValidationError("Invalid transaction binding.");
  }

  const now = deps.now?.() ?? new Date();
  const expiresAt = new Date(now.getTime() + 5 * 60_000);
  const nonce = deps.randomNonce?.() ?? randomBytes(32).toString("hex");
  const payloadBinding = metadataPayloadBinding(input);
  const wallet = getAddress(input.wallet);
  const challenge = buildWalletChallenge({
    wallet,
    action: input.action,
    registry: deps.registry,
    payloadBinding,
    nonce,
    issuedAt: now,
    expiresAt
  });

  await deps.save({
    wallet: wallet.toLowerCase(),
    nonce_hash: hashNonce(nonce),
    action: input.action,
    issued_at: now.toISOString(),
    expires_at: expiresAt.toISOString()
  });

  return {
    challenge,
    payloadBinding,
    issuedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString()
  };
}
