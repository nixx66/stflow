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

export type CreateStage = "idle" | "signing" | "confirming" | "saved" | "error";

type CreateStageEvent =
  | "wallet_requested"
  | "hash_received"
  | "receipt_confirmed"
  | "receipt_reverted";

const transitions: Record<CreateStage, Partial<Record<CreateStageEvent, CreateStage>>> = {
  idle: { wallet_requested: "signing" },
  signing: { hash_received: "confirming" },
  confirming: { receipt_confirmed: "saved", receipt_reverted: "error" },
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
  txHash?: Hex;
  invoice?: CreatedInvoiceEvent;
  metadataPending?: boolean;
  error?: string;
};

type CreateStateEvent =
  | { type: "wallet_requested" }
  | { type: "hash_received"; txHash: Hex }
  | { type: "receipt_confirmed"; invoice: CreatedInvoiceEvent }
  | { type: "receipt_reverted"; error: string }
  | { type: "metadata_saved" }
  | { type: "metadata_failed"; error: string }
  | { type: "failed"; error: string };

export function nextCreateStage(stage: CreateStage, event: CreateStageEvent): CreateStage {
  const next = transitions[stage][event];

  if (!next) {
    throw new Error(`Invalid invoice creation transition: ${stage} -> ${event}`);
  }

  return next;
}

export function reduceCreateState(state: CreateState, event: CreateStateEvent): CreateState {
  switch (event.type) {
    case "wallet_requested":
      return { stage: nextCreateStage(state.stage, event.type) };
    case "hash_received":
      return {
        stage: nextCreateStage(state.stage, event.type),
        txHash: event.txHash
      };
    case "receipt_confirmed":
      return {
        ...state,
        stage: nextCreateStage(state.stage, event.type),
        invoice: event.invoice
      };
    case "receipt_reverted":
      return {
        ...state,
        stage: nextCreateStage(state.stage, event.type),
        error: event.error
      };
    case "metadata_saved":
      return { ...state, metadataPending: false, error: undefined };
    case "metadata_failed":
      return {
        ...state,
        metadataPending: true,
        error: event.error
      };
    case "failed":
      return { ...state, stage: "error", error: event.error };
  }
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
