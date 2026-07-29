export type InvoiceStatus = "pending" | "paid" | "expired" | "cancelled";

export type Invoice = {
  id: string;
  merchantWallet: string;
  customerName?: string;
  customerWallet?: string;
  payerWallet?: string;
  title: string;
  description?: string;
  memo?: string;
  amount: string;
  currency: "USDC";
  status: InvoiceStatus;
  creationTxHash?: string;
  paymentTxHash?: string;
  chainId: number;
  createdAt: string;
  paidAt?: string;
  expiresAt?: string;
};

export type Receipt = {
  id: string;
  invoiceId: string;
  receiptNumber: string;
  merchantWallet: string;
  payerWallet: string;
  amount: string;
  currency: "USDC";
  paymentTxHash: string;
  paidAt: string;
  memo?: string;
};
