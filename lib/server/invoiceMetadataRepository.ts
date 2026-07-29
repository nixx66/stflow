import "server-only";

import { getSupabaseAdmin } from "./supabase.ts";
import type { MetadataRepository } from "./internal/signedInvoiceMetadata.ts";

const columns = [
  "invoice_id",
  "chain_id",
  "registry_address",
  "merchant_wallet",
  "payer_wallet",
  "customer_name",
  "title",
  "description",
  "memo",
  "metadata_hash",
  "amount_raw",
  "due_chain_at",
  "create_tx_hash",
  "create_block_number",
  "create_log_index"
].join(",");

export function getInvoiceMetadataRepository(): MetadataRepository {
  const db = getSupabaseAdmin();

  return {
    async consumeNonce(input) {
      const { data, error } = await db
        .from("wallet_nonces")
        .update({ consumed_at: input.now })
        .eq("wallet", input.wallet)
        .eq("nonce_hash", input.nonceHash)
        .eq("action", input.action)
        .is("consumed_at", null)
        .gt("expires_at", input.now)
        .select("nonce_hash")
        .maybeSingle();
      if (error) throw error;
      return Boolean(data);
    },

    async find(identity) {
      const { data, error } = await db
        .from("invoice_metadata")
        .select(columns)
        .eq("chain_id", identity.chainId)
        .eq("registry_address", identity.registry)
        .eq("invoice_id", identity.invoiceId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as Record<string, unknown> | null;
    },

    async insert(row) {
      const { error } = await db.from("invoice_metadata").insert(row);
      if (!error) return "inserted";
      if (error.code === "23505") return "conflict";
      throw error;
    }
  };
}
