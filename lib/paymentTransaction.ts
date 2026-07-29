import {
  decodeEventLog,
  getAddress,
  isAddressEqual,
  parseAbiItem,
  type Address,
  type Hex
} from "viem";

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
  requestId?: Hex;
  approvalTxHash?: Hex;
  paymentTxHash?: Hex;
  error?: string;
};

type PaymentAction =
  | { type: "started"; requestId: Hex }
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
    throw new Error("Invoice payment is already in progress.");
  }
  return requestId;
}

export function reducePaymentState(
  state: PaymentState,
  action: PaymentAction
): PaymentState {
  if (action.type !== "started" && state.requestId !== action.requestId) {
    return state;
  }

  switch (action.type) {
    case "started":
      return {
        stage: "checking",
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

type PaidEvent = {
  id: Hex;
  payer: Address;
  merchant: Address;
  amount: bigint;
};

function samePayment(actual: PaidEvent, expected: PaidEvent) {
  return (
    actual.id === expected.id &&
    isAddressEqual(actual.payer, expected.payer) &&
    isAddressEqual(actual.merchant, expected.merchant) &&
    actual.amount === expected.amount
  );
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
    confirmed.id !== submitted.id ||
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
