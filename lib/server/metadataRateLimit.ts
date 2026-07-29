import "server-only";

import { createHash } from "node:crypto";
import { getAddress, isAddress } from "viem";
import { getSupabaseAdmin } from "./supabase.ts";

export class RateLimitError extends Error {}
export class ClientIdentityError extends Error {}

function clientHash(request: Request) {
  const production = process.env.NODE_ENV === "production";
  const vercel = process.env.VERCEL === "1";
  const forwarded = request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim();
  if (production && (!vercel || !forwarded)) {
    throw new ClientIdentityError("Trusted client identity unavailable.");
  }
  const identity = vercel && forwarded ? forwarded : "local-development";
  return createHash("sha256").update(identity).digest("hex");
}

export async function enforceMetadataRateLimit(
  request: Request,
  route: string,
  wallet: string,
  limits: { wallet: number; client: number }
) {
  if (!isAddress(wallet, { strict: false })) throw new RateLimitError("Invalid wallet.");
  const { data, error } = await getSupabaseAdmin().rpc("consume_metadata_rate_limit", {
    p_route: route,
    p_wallet: getAddress(wallet).toLowerCase(),
    p_client_hash: clientHash(request),
    p_wallet_limit: limits.wallet,
    p_client_limit: limits.client,
    p_window_seconds: 60
  });
  if (error) throw new ClientIdentityError("Rate limit unavailable.");
  if (data !== true) throw new RateLimitError("Too many requests.");
}
