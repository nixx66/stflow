import type { PayerBlockReason } from "./invoiceStatus.ts";

const messages: Record<Exclude<PayerBlockReason, null>, string> = {
  wallet_required: "Connect the payer wallet assigned to this invoice.",
  merchant_wallet: "Merchant wallet cannot pay its own invoice.",
  wrong_payer_wallet: "Switch to the payer wallet assigned to this invoice."
};

export const payerError = (reason: Exclude<PayerBlockReason, null>) => messages[reason];
