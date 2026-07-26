import type { STFlowPaymentMode } from "./arc.ts";

export const DEFAULT_PAYMENT_MODE: STFlowPaymentMode = "mock";

export function getPaymentMode(
  value = process.env.NEXT_PUBLIC_STFLOW_PAYMENT_MODE
): STFlowPaymentMode {
  switch (value) {
    case "erc20-transfer":
    case "memo-transfer":
      return value;
    default:
      return DEFAULT_PAYMENT_MODE;
  }
}

export function isLivePaymentMode(mode: STFlowPaymentMode) {
  return mode === "erc20-transfer" || mode === "memo-transfer";
}

export function getPaymentModeLabel(mode: STFlowPaymentMode) {
  switch (mode) {
    case "erc20-transfer":
      return "USDC live";
    case "memo-transfer":
      return "Memo live";
    default:
      return "Mock settlement";
  }
}

export function getPaymentButtonLabel(mode: STFlowPaymentMode) {
  switch (mode) {
    case "erc20-transfer":
      return "Pay USDC";
    case "memo-transfer":
      return "Pay USDC with memo";
    default:
      return "Pay USDC (Mock)";
  }
}
