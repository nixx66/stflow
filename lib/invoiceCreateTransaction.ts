import {
  bytesToHex,
  decodeEventLog,
  getAddress,
  isAddressEqual,
  parseAbiItem,
  parseUnits,
  type Address,
  type Hex
} from "viem";

export type CreateStage =
  | "idle"
  | "signing"
  | "confirming"
  | "persisting"
  | "saved"
  | "error";

type CreateStageEvent =
  | "wallet_requested"
  | "hash_received"
  | "receipt_confirmed"
  | "receipt_reverted"
  | "metadata_saved"
  | "metadata_failed";

const transitions: Record<CreateStage, Partial<Record<CreateStageEvent, CreateStage>>> = {
  idle: { wallet_requested: "signing" },
  signing: { hash_received: "confirming" },
  confirming: { receipt_confirmed: "persisting", receipt_reverted: "error" },
  persisting: { metadata_saved: "saved", metadata_failed: "saved" },
  saved: { wallet_requested: "signing" },
  error: { wallet_requested: "signing" }
};

export const invoiceCreatedEvent = parseAbiItem(
  "event InvoiceCreated(bytes32 indexed id, address indexed merchant, address indexed payer, uint128 amount, uint64 dueAt, bytes32 metadataHash)"
);

export type CreatedInvoiceEvent = {
  id: Hex;
  merchant: Address;
  payer: Address;
  amount: bigint;
  dueAt: bigint;
  metadataHash: Hex;
};

type ReceiptLog = {
  address: Address;
  data: Hex;
  topics: [] | [Hex, ...Hex[]];
};

type CreationReceipt = {
  status: "success" | "reverted";
  logs: readonly ReceiptLog[];
};

export type CreateState = {
  stage: CreateStage;
  requestId?: Hex;
  txHash?: Hex;
  invoice?: CreatedInvoiceEvent;
  metadataPending?: boolean;
  error?: string;
  recovery?: {
    txHash: Hex;
    invoice: CreatedInvoiceEvent;
    metadataPending: boolean;
    error?: string;
  };
};

type CreateStateEvent =
  | { type: "wallet_requested"; requestId: Hex }
  | { type: "hash_received"; requestId: Hex; txHash: Hex }
  | { type: "receipt_confirmed"; requestId: Hex; invoice: CreatedInvoiceEvent }
  | { type: "receipt_reverted"; requestId: Hex; error: string }
  | { type: "metadata_saved"; requestId: Hex }
  | { type: "metadata_failed"; requestId: Hex; error: string }
  | { type: "failed"; requestId: Hex; error: string };

export function nextCreateStage(stage: CreateStage, event: CreateStageEvent): CreateStage {
  const next = transitions[stage][event];

  if (!next) {
    throw new Error(`Invalid invoice creation transition: ${stage} -> ${event}`);
  }

  return next;
}

export function reduceCreateState(state: CreateState, event: CreateStateEvent): CreateState {
  if (event.type !== "wallet_requested" && state.requestId !== event.requestId) {
    return state;
  }

  switch (event.type) {
    case "wallet_requested":
      const recovery =
        state.txHash && state.invoice
          ? {
              txHash: state.txHash,
              invoice: state.invoice,
              metadataPending: Boolean(state.metadataPending),
              error: state.error
            }
          : state.recovery;
      return {
        stage: nextCreateStage(state.stage, event.type),
        requestId: event.requestId,
        recovery
      };
    case "hash_received":
      return {
        stage: nextCreateStage(state.stage, event.type),
        requestId: event.requestId,
        txHash: event.txHash
      };
    case "receipt_confirmed":
      return {
        ...state,
        stage: nextCreateStage(state.stage, event.type),
        invoice: event.invoice,
        metadataPending: true
      };
    case "receipt_reverted":
      return {
        ...state,
        stage: nextCreateStage(state.stage, event.type),
        error: event.error
      };
    case "metadata_saved":
      return {
        ...state,
        stage: nextCreateStage(state.stage, event.type),
        metadataPending: false,
        error: undefined
      };
    case "metadata_failed":
      return {
        ...state,
        stage: nextCreateStage(state.stage, event.type),
        metadataPending: true,
        error: event.error
      };
    case "failed":
      return { ...state, stage: "error", error: event.error };
  }
}

export function beginCreateRequest(activeRequest: Hex | undefined, requestId: Hex) {
  if (activeRequest) {
    throw new Error("Invoice creation is already in progress.");
  }

  return requestId;
}

export function parseInvoiceAmount(value: string): bigint {
  const amount = value.trim();

  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,6})?$/.test(amount)) {
    throw new Error("Enter a valid USDC amount with up to 6 decimal places.");
  }

  const units = parseUnits(amount, 6);

  if (
    units <= BigInt(0) ||
    units > (BigInt(1) << BigInt(128)) - BigInt(1)
  ) {
    throw new Error("Enter a valid USDC amount greater than zero.");
  }

  return units;
}

export function parseInvoiceDeadline(
  value: string,
  nowSeconds = BigInt(Math.floor(Date.now() / 1000))
): bigint {
  const milliseconds = Date.parse(value);

  if (!value || !Number.isFinite(milliseconds)) {
    throw new Error("Enter a valid future payment deadline.");
  }

  const dueAt = BigInt(Math.floor(milliseconds / 1000));

  if (
    dueAt <= nowSeconds ||
    dueAt > (BigInt(1) << BigInt(64)) - BigInt(1)
  ) {
    throw new Error("Enter a valid future payment deadline.");
  }

  return dueAt;
}

export function createReferenceId(
  randomValues: (bytes: Uint8Array) => Uint8Array = (bytes) =>
    crypto.getRandomValues(bytes)
): Hex {
  return bytesToHex(randomValues(new Uint8Array(32)));
}

function sameCreatedInvoice(actual: CreatedInvoiceEvent, expected: CreatedInvoiceEvent) {
  return (
    actual.id === expected.id &&
    isAddressEqual(actual.merchant, expected.merchant) &&
    isAddressEqual(actual.payer, expected.payer) &&
    actual.amount === expected.amount &&
    actual.dueAt === expected.dueAt &&
    actual.metadataHash === expected.metadataHash
  );
}

export function validateInvoiceCreated(
  receipt: CreationReceipt,
  registry: Address,
  expected: CreatedInvoiceEvent
): CreatedInvoiceEvent {
  if (receipt.status !== "success") {
    throw new Error("Invoice creation transaction reverted.");
  }

  const events = receipt.logs
    .filter((log) => isAddressEqual(log.address, registry))
    .flatMap((log) => {
      try {
        const decoded = decodeEventLog({
          abi: [invoiceCreatedEvent],
          data: log.data,
          topics: log.topics,
          eventName: "InvoiceCreated"
        });
        const args = decoded.args;

        return [{
          id: args.id,
          merchant: getAddress(args.merchant),
          payer: getAddress(args.payer),
          amount: args.amount,
          dueAt: args.dueAt,
          metadataHash: args.metadataHash
        }];
      } catch {
        return [];
      }
    });

  if (events.length !== 1) {
    throw new Error("Expected exactly one InvoiceCreated event from the registry.");
  }

  const [created] = events;

  if (!sameCreatedInvoice(created, expected)) {
    throw new Error("InvoiceCreated event does not match the submitted invoice.");
  }

  return created;
}
