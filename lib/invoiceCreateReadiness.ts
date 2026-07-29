export type InvoiceCreateReadinessInput = {
  title: string;
  amount: string;
  merchantWallet: string;
  expiresAt?: string;
};

export type InvoiceCreateReadinessItem = {
  id: "title" | "amount" | "merchant-wallet" | "expiry";
  label: string;
  detail: string;
  ready: boolean;
};

export function isValidInvoiceWalletAddress(wallet: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(wallet.trim());
}

export function getInvoiceCreateReadiness(input: InvoiceCreateReadinessInput): InvoiceCreateReadinessItem[] {
  const numericAmount = Number(input.amount);

  return [
    {
      id: "title",
      label: "Invoice identity",
      detail: "Title is used across payment link, receipt, and dashboard records.",
      ready: input.title.trim().length > 0
    },
    {
      id: "amount",
      label: "USDC amount",
      detail: "Amount must be greater than zero before the checkout link is issued.",
      ready: Number.isFinite(numericAmount) && numericAmount > 0
    },
    {
      id: "merchant-wallet",
      label: "Merchant wallet",
      detail: "Receiving wallet is attached to the invoice object.",
      ready: input.merchantWallet.trim().startsWith("0x")
    },
    {
      id: "expiry",
      label: "Payment window",
        detail: "A future payment deadline is required by the Arc Testnet registry.",
      ready: Boolean(input.expiresAt)
    }
  ];
}
