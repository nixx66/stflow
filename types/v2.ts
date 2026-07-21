export type V2InvoiceStatus = "draft" | "pending" | "paid" | "archived";
export type V2InvoiceDirection = "receivable" | "payable";

export type V2Customer = {
  id: string;
  name: string;
  email: string;
  wallet: string;
  segment: "Builder" | "Agency" | "DAO" | "Treasury";
  totalPaid: number;
  lastPaymentAt?: string;
};

export type V2Order = {
  id: string;
  customerId: string;
  title: string;
  category: "Service" | "Subscription" | "Grant" | "Product";
  amount: number;
  currency: "USDC";
  status: "open" | "fulfilled" | "cancelled";
};

export type V2Invoice = {
  id: string;
  customerId: string;
  orderId: string;
  direction: V2InvoiceDirection;
  merchantName: string;
  merchantWallet: string;
  payerName: string;
  payerWallet: string;
  title: string;
  amount: number;
  currency: "USDC";
  status: V2InvoiceStatus;
  paymentLink: string;
  qrPayment: boolean;
  pdfReceipt: boolean;
  memo?: string;
  txHash?: string;
  createdAt: string;
  paidAt?: string;
};

export type V2Activity = {
  id: string;
  label: string;
  detail: string;
  status: "success" | "pending" | "info";
  createdAt: string;
};

export type V2AuditTimelineItem = {
  id: string;
  label: string;
  detail: string;
  state: "complete" | "pending" | "reserved";
  timestamp?: string;
};

export type V2InvoiceDetail = {
  invoice: V2Invoice;
  customer: V2Customer;
  order: V2Order;
  timeline: V2AuditTimelineItem[];
};
