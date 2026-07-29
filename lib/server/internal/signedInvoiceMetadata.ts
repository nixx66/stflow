import {
  decodeEventLog,
  getAddress,
  isAddressEqual,
  isHash,
  isHex,
  keccak256,
  toHex,
  type Address,
  type Hex
} from "viem";
import { invoiceCreatedEvent } from "../../invoiceCreateTransaction.ts";
import {
  canonicalInvoiceMetadata,
  hashInvoiceMetadata,
  invoiceIdFromReference,
  type InvoiceMetadata
} from "../../invoiceMetadata.ts";
import { verifyWalletAuthorization } from "./walletAuth.ts";

type Identity = {
  chainId: number;
  registry: string;
  invoiceId: string;
};

export interface MetadataRepository {
  consumeNonce(input: {
    wallet: string;
    nonceHash: string;
    action: "create_invoice";
    now: string;
  }): Promise<boolean>;
  find(identity: Identity): Promise<Record<string, unknown> | null>;
  insert(row: Record<string, unknown>): Promise<"inserted" | "conflict">;
}

type Rpc = {
  getReceipt(input: { hash: Hex }): Promise<{
    status: "success" | "reverted";
    blockNumber: bigint;
    logs: readonly {
      address: Address;
      logIndex: number;
      data: Hex;
      topics: readonly Hex[];
    }[];
  }>;
  getBlock(input: { blockNumber: bigint }): Promise<{ timestamp: bigint }>;
};

type Config = {
  chainId: number;
  registry: Address;
  rpcUrl?: string;
};

export class MetadataValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MetadataValidationError";
  }
}

export class MetadataConflictError extends Error {
  constructor(message = "Invoice metadata conflict.") {
    super(message);
    this.name = "MetadataConflictError";
  }
}

function canonicalMetadata(metadata: InvoiceMetadata) {
  if (
    !metadata ||
    typeof metadata !== "object" ||
    typeof metadata.customerName !== "string" ||
    typeof metadata.title !== "string" ||
    typeof metadata.description !== "string" ||
    typeof metadata.memo !== "string"
  ) {
    throw new MetadataValidationError("Invalid invoice metadata.");
  }
  const canonical = JSON.parse(canonicalInvoiceMetadata(metadata)) as InvoiceMetadata;
  if (
    canonical.customerName.length > 200 ||
    canonical.title.length < 1 ||
    canonical.title.length > 200 ||
    canonical.description.length > 5000 ||
    canonical.memo.length > 1000
  ) {
    throw new MetadataValidationError("Invalid invoice metadata.");
  }
  return canonical;
}

export function metadataPayloadBinding(input: {
  txHash: Hex;
  referenceId: Hex;
  metadata: InvoiceMetadata;
}) {
  return keccak256(toHex(JSON.stringify({
    txHash: input.txHash.toLowerCase(),
    referenceId: input.referenceId.toLowerCase(),
    metadata: canonicalMetadata(input.metadata)
  })));
}

function sameRow(row: Record<string, unknown>, expected: Record<string, unknown>) {
  const keys = [
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
  ];
  return keys.every((key) => String(row[key]) === String(expected[key]));
}

function validateInput(input: {
  txHash: Hex;
  referenceId: Hex;
  metadata: InvoiceMetadata;
  challenge: string;
  signature: Hex;
}) {
  if (
    !input ||
    typeof input !== "object" ||
    typeof input.challenge !== "string" ||
    typeof input.signature !== "string" ||
    typeof input.txHash !== "string" ||
    typeof input.referenceId !== "string" ||
    !isHash(input.txHash) ||
    !isHash(input.referenceId) ||
    !isHex(input.signature, { strict: true }) ||
    input.signature.length !== 132 ||
    input.challenge.length > 2048
  ) {
    throw new MetadataValidationError("Invalid metadata request.");
  }
  return canonicalMetadata(input.metadata);
}

export async function persistSignedInvoiceMetadata(
  input: {
    txHash: Hex;
    referenceId: Hex;
    metadata: InvoiceMetadata;
    challenge: string;
    signature: Hex;
  },
  deps: {
    repository: MetadataRepository;
    rpc: Rpc;
    config: Config;
    now?: () => Date;
  }
) {
  const metadata = validateInput(input);
  const receipt = await deps.rpc.getReceipt({ hash: input.txHash });
  if (receipt.status !== "success") {
    throw new MetadataValidationError("Invoice creation transaction reverted.");
  }

  const events = receipt.logs.flatMap((log) => {
    if (!isAddressEqual(log.address, deps.config.registry)) return [];
    try {
      const decoded = decodeEventLog({
        abi: [invoiceCreatedEvent],
        eventName: "InvoiceCreated",
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]]
      });
      return [{ ...decoded.args, logIndex: log.logIndex }];
    } catch {
      return [];
    }
  });
  if (events.length !== 1) {
    throw new MetadataValidationError(
      "Expected exactly one InvoiceCreated event from the registry."
    );
  }

  const event = events[0];
  const expectedHash = hashInvoiceMetadata(metadata);
  if (event.metadataHash.toLowerCase() !== expectedHash.toLowerCase()) {
    throw new MetadataValidationError("Invoice metadata hash does not match the chain.");
  }
  const expectedId = invoiceIdFromReference(event.merchant, input.referenceId);
  if (event.id.toLowerCase() !== expectedId.toLowerCase()) {
    throw new MetadataValidationError("Invoice reference does not match the chain.");
  }

  const block = await deps.rpc.getBlock({ blockNumber: receipt.blockNumber });
  const registry = deps.config.registry.toLowerCase();
  const id = event.id.toLowerCase();
  const row: Record<string, unknown> = {
    invoice_id: id,
    chain_id: deps.config.chainId,
    registry_address: registry,
    merchant_wallet: getAddress(event.merchant).toLowerCase(),
    payer_wallet: getAddress(event.payer).toLowerCase(),
    customer_name: metadata.customerName,
    title: metadata.title,
    description: metadata.description,
    memo: metadata.memo,
    canonical_metadata: metadata,
    metadata_hash: expectedHash.toLowerCase(),
    amount_raw: event.amount.toString(),
    created_chain_at: block.timestamp.toString(),
    due_chain_at: event.dueAt.toString(),
    paid_chain_at: null,
    cancelled_chain_at: null,
    create_tx_hash: input.txHash.toLowerCase(),
    create_block_number: receipt.blockNumber.toString(),
    create_log_index: event.logIndex,
    indexed_status: "pending"
  };
  const identity = { chainId: deps.config.chainId, registry, invoiceId: id };

  const authorization = await verifyWalletAuthorization({
    message: input.challenge,
    signature: input.signature,
    expectedWallet: event.merchant,
    expectedAction: "create_invoice",
    expectedRegistry: deps.config.registry,
    expectedPayloadBinding: metadataPayloadBinding(input),
    now: deps.now?.()
  });

  const existing = await deps.repository.find(identity);
  if (existing) {
    if (!sameRow(existing, row)) throw new MetadataConflictError();
    return { invoiceId: id, idempotent: true };
  }

  const consumed = await deps.repository.consumeNonce({
    wallet: authorization.wallet,
    nonceHash: authorization.nonceHash,
    action: "create_invoice",
    now: (deps.now?.() ?? new Date()).toISOString()
  });
  if (!consumed) throw new MetadataConflictError("Nonce expired or already used.");

  const inserted = await deps.repository.insert(row);
  if (inserted === "conflict") {
    const raced = await deps.repository.find(identity);
    if (!raced || !sameRow(raced, row)) throw new MetadataConflictError();
    return { invoiceId: id, idempotent: true };
  }

  return { invoiceId: id, idempotent: false };
}

export async function getInvoiceMetadata(
  invoiceId: string,
  deps: { repository: MetadataRepository; config: Config }
) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(invoiceId)) {
    throw new MetadataValidationError("Invalid invoice ID.");
  }
  const id = invoiceId.toLowerCase();
  const row = await deps.repository.find({
    chainId: deps.config.chainId,
    registry: deps.config.registry.toLowerCase(),
    invoiceId: id
  });
  if (!row) return null;

  return {
    invoiceId: id,
    customerName: String(row.customer_name ?? ""),
    title: String(row.title),
    description: String(row.description ?? ""),
    memo: String(row.memo ?? ""),
    metadataHash: String(row.metadata_hash)
  };
}
