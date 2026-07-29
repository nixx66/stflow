import "server-only";

import { getSupabaseAdmin } from "./supabase.ts";
import type { MetadataRepository } from "./internal/signedInvoiceMetadata.ts";

export class RepositoryAuthError extends Error {}
export class RepositoryConflictError extends Error {}
export class RepositoryError extends Error {}

export function getInvoiceMetadataRepository(): MetadataRepository {
  const db = getSupabaseAdmin();
  return {
    async persistAtomic({ wallet, nonceHash, row }) {
      const { data, error } = await db.rpc("persist_invoice_metadata", {
        p_wallet: wallet,
        p_nonce_hash: nonceHash,
        p_invoice_id: row.invoice_id,
        p_chain_id: row.chain_id,
        p_registry_address: row.registry_address,
        p_merchant_wallet: row.merchant_wallet,
        p_payer_wallet: row.payer_wallet,
        p_customer_name: row.customer_name,
        p_title: row.title,
        p_description: row.description,
        p_memo: row.memo,
        p_canonical_metadata: row.canonical_metadata,
        p_metadata_hash: row.metadata_hash,
        p_amount_raw: row.amount_raw,
        p_created_chain_at: row.created_chain_at,
        p_due_chain_at: row.due_chain_at,
        p_create_tx_hash: row.create_tx_hash,
        p_create_block_number: row.create_block_number,
        p_create_log_index: row.create_log_index
      });
      if (error?.message.includes("STFLOW_NONCE_INVALID")) {
        throw new RepositoryAuthError("Nonce expired or already used.");
      }
      if (error?.message.includes("STFLOW_METADATA_CONFLICT")) {
        throw new RepositoryConflictError("Invoice metadata conflict.");
      }
      if (error) throw new RepositoryError("Metadata database unavailable.");
      if (data !== "inserted" && data !== "idempotent") {
        throw new RepositoryError("Unexpected metadata result.");
      }
      return data;
    },

    async find(identity) {
      const { data, error } = await db
        .from("invoice_metadata")
        .select("invoice_id,customer_name,title,description,memo,metadata_hash")
        .eq("chain_id", identity.chainId)
        .eq("registry_address", identity.registry)
        .eq("invoice_id", identity.invoiceId)
        .maybeSingle();
      if (error) throw new RepositoryError("Metadata database unavailable.");
      return data as unknown as Record<string, unknown> | null;
    }
  };
}
