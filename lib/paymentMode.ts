import type { STFlowPaymentMode } from "./arc.ts";

export const DEFAULT_PAYMENT_MODE: STFlowPaymentMode = "mock";

export function getPaymentMode(
  value = process.env.NEXT_PUBLIC_STFLOW_PAYMENT_MODE
): STFlowPaymentMode {
  if (value === "erc20-transfer" || value === "memo-transfer") return value;
  return DEFAULT_PAYMENT_MODE;
}

export function isLivePaymentMode(mode: STFlowPaymentMode) {
  return mode === "erc20-transfer" || mode === "memo-transfer";
}

export function getPaymentModeLabel(mode: STFlowPaymentMode) {
  if (mode === "erc20-transfer") return "USDC live";
  if (mode === "memo-transfer") return "Memo live";
  return "Mock settlement";
}

export function getPaymentButtonLabel(mode: STFlowPaymentMode) {
  if (mode === "erc20-transfer") return "Pay USDC";
  if (mode === "memo-transfer") return "Pay USDC with memo";
  return "Pay USDC (Mock)";
}
