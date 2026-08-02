import {
  decodeEventLog,
  getAddress,
  isAddressEqual,
  parseAbiItem,
  type Address,
  type Hex
} from "viem";
import { ARC_CONTRACTS } from "./arc.ts";

export type ChainInvoice = {
  id: Hex;
  merchant: Address;
  payer: Address;
  amount: bigint;
  createdAt: bigint;
  dueAt: bigint;
  paidAt: bigint;
  metadataHash: Hex;
  status: number;
};

export type ChainInvoiceState = "pending" | "paid" | "cancelled";
export type VerifiedPaymentProof = {
  status: "verified";
  txHash: Hex;
};

export type PaymentStage =
  | "idle"
  | "checking"
  | "approval-signing"
  | "approval-confirming"
  | "payment-signing"
  | "payment-confirming"
  | "success"
  | "error";

export type PaymentState = {
  stage: PaymentStage;
  invoiceId?: Hex;
  requestId?: Hex;
  approvalTxHash?: Hex;
  paymentTxHash?: Hex;
  error?: string;
};

type PaymentAction =
  | { type: "reset"; invoiceId: Hex }
  | { type: "started"; invoiceId: Hex; requestId: Hex }
  | { type: "planned"; requestId: Hex; needsApproval: boolean }
  | { type: "approval_hash"; requestId: Hex; txHash: Hex }
  | { type: "approval_confirmed"; requestId: Hex }
  | { type: "payment_hash"; requestId: Hex; txHash: Hex }
  | { type: "payment_confirmed"; requestId: Hex }
  | { type: "failed"; requestId: Hex; error: string };

type ReceiptLog = {
  address: Address;
  data: Hex;
  topics: [] | [Hex, ...Hex[]];
};

type PaymentReceipt = {
  status: "success" | "reverted";
  logs: readonly ReceiptLog[];
};

export const invoicePaidEvent = parseAbiItem(
  "event InvoicePaid(bytes32 indexed id, address indexed payer, address indexed merchant, uint128 amount)"
);

export function getPaymentPlan(balance: bigint, allowance: bigint, amount: bigint) {
  if (balance < amount) {
    return { canPay: false, needsApproval: false, approvalAmount: BigInt(0) };
  }

  const needsApproval = allowance < amount;
  return {
    canPay: true,
    needsApproval,
    approvalAmount: needsApproval ? amount : BigInt(0)
  };
}

export function formatUsdc(amount: bigint) {
  const whole = amount / BigInt(1_000_000);
  const fraction = (amount % BigInt(1_000_000))
    .toString()
    .padStart(6, "0")
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function normalizeInvoiceId(value: string): Hex {
  const normalized = value.startsWith("0X")
    ? `0x${value.slice(2).toLowerCase()}`
    : value.toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(normalized)) {
    throw new Error("Invoice ID must be a bytes32 value.");
  }
  return normalized as Hex;
}

export function chainInvoiceStatus(status: number): ChainInvoiceState {
  if (status === 0) return "pending";
  if (status === 1) return "paid";
  if (status === 2) return "cancelled";
  throw new Error("Unknown invoice status.");
}

export function validateRegistryUsdc(address: Address) {
  if (!isAddressEqual(address, ARC_CONTRACTS.usdc)) {
    throw new Error("Invoice registry uses an unexpected USDC contract.");
  }
}

export function classifyMetadataResponse(status: number) {
  if (status >= 200 && status < 300) return "available" as const;
  if (status === 404) return "missing" as const;
  return "retryable-error" as const;
}

export function isCurrentInvoiceLoad(
  token: { invoiceId: Hex; generation: number },
  invoiceId: string,
  generation: number
) {
  return (
    token.generation === generation &&
    token.invoiceId === normalizeInvoiceId(invoiceId)
  );
}

export function selectInvoiceScope<T extends { invoiceId?: Hex }>(
  currentInvoiceId: string,
  scoped: T | undefined
) {
  if (!scoped?.invoiceId) return undefined;
  try {
    return normalizeInvoiceId(currentInvoiceId) ===
      normalizeInvoiceId(scoped.invoiceId)
      ? scoped
      : undefined;
  } catch {
    return undefined;
  }
}

export function selectInvoiceRoute(invoiceId: string) {
  try {
    return { invoiceId: normalizeInvoiceId(invoiceId) };
  } catch (error) {
    return {
      isLoading: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Invoice ID must be a bytes32 value."
    };
  }
}

export function validatePaymentSnapshot(
  invoice: ChainInvoice,
  payer: Address,
  now: bigint
) {
  if (!isAddressEqual(invoice.payer, payer)) {
    throw new Error("Only the assigned payer wallet can pay this invoice.");
  }
  if (invoice.status !== 0) {
    throw new Error("Invoice is not pending.");
  }
  if (now >= invoice.dueAt) {
    throw new Error("Invoice has expired.");
  }
  return invoice;
}

export function validatePaymentWrite(
  snapshot: { address?: Address; chainId: number },
  payer: Address
) {
  if (!snapshot.address || !isAddressEqual(snapshot.address, payer)) {
    throw new Error("The connected wallet changed before transaction broadcast.");
  }
  if (snapshot.chainId !== 5042002) {
    throw new Error("The connected network changed before transaction broadcast.");
  }
}

export function beginPayment(activeRequest: Hex | undefined, requestId: Hex) {
  if (activeRequest) {
    return {
      acquired: false as const,
      error: "Invoice payment is already in progress."
    };
  }
  return { acquired: true as const, requestId };
}

export function reducePaymentState(
  state: PaymentState,
  action: PaymentAction
): PaymentState {
  if (action.type === "reset") {
    return { stage: "idle", invoiceId: normalizeInvoiceId(action.invoiceId) };
  }
  if (state.stage === "success") return state;
  if (action.type !== "started" && state.requestId !== action.requestId) {
    return state;
  }

  switch (action.type) {
    case "started":
      return {
        stage: "checking",
        invoiceId: normalizeInvoiceId(action.invoiceId),
        requestId: action.requestId
      };
    case "planned":
      return {
        ...state,
        stage: action.needsApproval ? "approval-signing" : "payment-signing"
      };
    case "approval_hash":
      return {
        ...state,
        stage: "approval-confirming",
        approvalTxHash: action.txHash
      };
    case "approval_confirmed":
      return { ...state, stage: "payment-signing" };
    case "payment_hash":
      return {
        ...state,
        stage: "payment-confirming",
        paymentTxHash: action.txHash
      };
    case "payment_confirmed":
      return { ...state, stage: "success", error: undefined };
    case "failed":
      return { ...state, stage: "error", error: action.error };
  }
}

export function markInvoiceReceiptConfirmed(invoice: ChainInvoice): ChainInvoice {
  return invoice.status === 1 ? invoice : { ...invoice, status: 1 };
}

type PaidEvent = {
  id: Hex;
  payer: Address;
  merchant: Address;
  amount: bigint;
};

function samePayment(actual: PaidEvent, expected: PaidEvent) {
  return (
    normalizeInvoiceId(actual.id) === normalizeInvoiceId(expected.id) &&
    isAddressEqual(actual.payer, expected.payer) &&
    isAddressEqual(actual.merchant, expected.merchant) &&
    actual.amount === expected.amount
  );
}

export async function findVerifiedPaymentHash(
  hashes: readonly Hex[],
  getReceipt: (hash: Hex) => Promise<PaymentReceipt>,
  registry: Address,
  expected: PaidEvent
) {
  const proof = await resolvePaymentProof(hashes, getReceipt, registry, expected);
  return proof.status === "verified" ? proof.txHash : undefined;
}

export async function resolvePaymentProof(
  hashes: readonly Hex[],
  getReceipt: (hash: Hex) => Promise<PaymentReceipt>,
  registry: Address,
  expected: PaidEvent
) {
  const valid: Hex[] = [];
  let rpcFailed = false;
  for (const hash of new Set(hashes)) {
    let receipt: PaymentReceipt;
    try {
      receipt = await getReceipt(hash);
    } catch {
      rpcFailed = true;
      continue;
    }
    try {
      validateInvoicePaid(receipt, registry, expected);
      valid.push(hash);
    } catch {
      // A decoded event mismatch is not payment proof.
    }
  }
  if (valid.length === 1 && !rpcFailed) {
    return { status: "verified" as const, txHash: valid[0] };
  }
  if (valid.length > 1) {
    return {
      status: "error" as const,
      error: "Payment proof is ambiguous. Retry shortly."
    };
  }
  return {
    status: "error" as const,
    error: rpcFailed
      ? "Payment proof could not be verified. Retry shortly."
      : "Payment proof is not available yet. Retry shortly."
  };
}

export function validateInvoicePaid(
  receipt: PaymentReceipt,
  registry: Address,
  expected: PaidEvent
) {
  if (receipt.status !== "success") {
    throw new Error("Invoice payment transaction reverted.");
  }

  const events = receipt.logs
    .filter((log) => isAddressEqual(log.address, registry))
    .flatMap((log) => {
      try {
        const { args } = decodeEventLog({
          abi: [invoicePaidEvent],
          eventName: "InvoicePaid",
          data: log.data,
          topics: log.topics
        });
        return [
          {
            id: args.id,
            payer: getAddress(args.payer),
            merchant: getAddress(args.merchant),
            amount: args.amount
          }
        ];
      } catch {
        return [];
      }
    });

  if (events.length !== 1) {
    throw new Error("Expected exactly one InvoicePaid event from the registry.");
  }
  if (!samePayment(events[0], expected)) {
    throw new Error("InvoicePaid event does not match the invoice.");
  }
  return events[0];
}

export function validateConfirmedPayment(
  confirmed: ChainInvoice,
  submitted: ChainInvoice
) {
  if (
    normalizeInvoiceId(confirmed.id) !== normalizeInvoiceId(submitted.id) ||
    !isAddressEqual(confirmed.merchant, submitted.merchant) ||
    !isAddressEqual(confirmed.payer, submitted.payer) ||
    confirmed.amount !== submitted.amount ||
    confirmed.dueAt !== submitted.dueAt ||
    confirmed.metadataHash !== submitted.metadataHash
  ) {
    throw new Error("Invoice chain data changed during payment.");
  }
  if (confirmed.status !== 1 || confirmed.paidAt === BigInt(0)) {
    throw new Error("Invoice payment is not confirmed onchain.");
  }
  return true;
}
