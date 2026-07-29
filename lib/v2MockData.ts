import type {
  V2Activity,
  V2AuditTimelineItem,
  V2Customer,
  V2InvoiceDirection,
  V2Invoice,
  V2InvoiceDetail,
  V2InvoiceStatus,
  V2Order
} from "../types/v2.ts";
import type { Invoice } from "../types/invoice.ts";
import { ARC_TESTNET } from "./arc.ts";

export const STFLOW_WORKSPACE_WALLET = "0xCEb541C9e4204e84321B87C6F4175bA72133509e";
const STFLOW_WORKSPACE_NAME = "STFlow Demo Merchant";

export const v2Customers: V2Customer[] = [
  {
    id: "cus-stflow-001",
    name: STFLOW_WORKSPACE_NAME,
    email: "settlement@stflow.app",
    wallet: STFLOW_WORKSPACE_WALLET,
    segment: "Builder",
    totalPaid: 0
  },
  {
    id: "cus-stf-001",
    name: "Helio Studio",
    email: "ops@helio.studio",
    wallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    segment: "Agency",
    totalPaid: 4400,
    lastPaymentAt: "2026-07-06T10:24:00.000Z"
  },
  {
    id: "cus-stf-002",
    name: "Northstar DAO",
    email: "treasury@northstar.dao",
    wallet: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    segment: "DAO",
    totalPaid: 3900,
    lastPaymentAt: "2026-07-04T15:05:00.000Z"
  },
  {
    id: "cus-stf-003",
    name: "Meridian Labs",
    email: "finance@meridianlabs.dev",
    wallet: "0xB98E7D6C5B4A39281706F5E4D3C2B1A098765432",
    segment: "Builder",
    totalPaid: 1150,
    lastPaymentAt: "2026-06-28T09:40:00.000Z"
  },
  {
    id: "cus-stf-004",
    name: "Greenline Treasury",
    email: "settlement@greenline.fi",
    wallet: "0xA12F8E7D5C4B3A2918076F5E4D3C2B1A09876543",
    segment: "Treasury",
    totalPaid: 0
  }
];

export const v2Orders: V2Order[] = [
  {
    id: "ord-1001",
    customerId: "cus-stf-001",
    title: "Landing sprint",
    category: "Service",
    amount: 1250,
    currency: "USDC",
    status: "fulfilled"
  },
  {
    id: "ord-1002",
    customerId: "cus-stf-002",
    title: "DAO contributor payout batch",
    category: "Grant",
    amount: 3900,
    currency: "USDC",
    status: "fulfilled"
  },
  {
    id: "ord-1003",
    customerId: "cus-stf-001",
    title: "Monthly checkout retainer",
    category: "Subscription",
    amount: 3150,
    currency: "USDC",
    status: "fulfilled"
  },
  {
    id: "ord-1004",
    customerId: "cus-stf-004",
    title: "Treasury reconciliation setup",
    category: "Service",
    amount: 1800,
    currency: "USDC",
    status: "open"
  },
  {
    id: "ord-1005",
    customerId: "cus-stf-003",
    title: "Builder toolkit license",
    category: "Product",
    amount: 525,
    currency: "USDC",
    status: "open"
  },
  {
    id: "ord-2001",
    customerId: "cus-stflow-001",
    title: "Proof integration review",
    category: "Service",
    amount: 740,
    currency: "USDC",
    status: "open"
  },
  {
    id: "ord-2002",
    customerId: "cus-stflow-001",
    title: "Security audit memo",
    category: "Service",
    amount: 1180,
    currency: "USDC",
    status: "open"
  }
];

export const v2Invoices: V2Invoice[] = [
  {
    id: "v2-inv-1001",
    customerId: "cus-stf-001",
    orderId: "ord-1001",
    direction: "receivable",
    merchantName: STFLOW_WORKSPACE_NAME,
    merchantWallet: STFLOW_WORKSPACE_WALLET,
    payerName: "Helio Studio",
    payerWallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    title: "Landing sprint",
    amount: 1250,
    currency: "USDC",
    status: "paid",
    paymentLink: "/pay/v2-inv-1001",
    qrPayment: true,
    pdfReceipt: true,
    memo: "Landing sprint deposit",
    txHash: "0x91f0afbd25fb0c713d2b46d7ae2acfed1917e7e194f5bf33a83e2df2f2c01990",
    createdAt: "2026-07-01T10:00:00.000Z",
    paidAt: "2026-07-01T10:07:00.000Z"
  },
  {
    id: "v2-inv-1002",
    customerId: "cus-stf-002",
    orderId: "ord-1002",
    direction: "receivable",
    merchantName: STFLOW_WORKSPACE_NAME,
    merchantWallet: STFLOW_WORKSPACE_WALLET,
    payerName: "Northstar DAO",
    payerWallet: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    title: "DAO contributor payout batch",
    amount: 3900,
    currency: "USDC",
    status: "paid",
    paymentLink: "/pay/v2-inv-1002",
    qrPayment: true,
    pdfReceipt: true,
    memo: "Q3 contributor payouts",
    txHash: "0x62c8d8fa1d678d82ec41be712afe9d6a735f808f2c9cf708ed4ddf29273eea65",
    createdAt: "2026-07-03T14:30:00.000Z",
    paidAt: "2026-07-03T14:46:00.000Z"
  },
  {
    id: "v2-inv-1003",
    customerId: "cus-stf-001",
    orderId: "ord-1003",
    direction: "receivable",
    merchantName: STFLOW_WORKSPACE_NAME,
    merchantWallet: STFLOW_WORKSPACE_WALLET,
    payerName: "Helio Studio",
    payerWallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    title: "Monthly checkout retainer",
    amount: 3150,
    currency: "USDC",
    status: "paid",
    paymentLink: "/pay/v2-inv-1003",
    qrPayment: true,
    pdfReceipt: true,
    memo: "July retainer",
    txHash: "0xa4a90854e8c0fd0670ce86dcd69e34e7e44a6555f94f2cdbcd85d08934c0cf41",
    createdAt: "2026-07-06T09:10:00.000Z",
    paidAt: "2026-07-06T10:24:00.000Z"
  },
  {
    id: "v2-inv-1004",
    customerId: "cus-stf-004",
    orderId: "ord-1004",
    direction: "receivable",
    merchantName: STFLOW_WORKSPACE_NAME,
    merchantWallet: STFLOW_WORKSPACE_WALLET,
    payerName: "Greenline Treasury",
    payerWallet: "0xA12F8E7D5C4B3A2918076F5E4D3C2B1A09876543",
    title: "Treasury reconciliation setup",
    amount: 1800,
    currency: "USDC",
    status: "pending",
    paymentLink: "/pay/v2-inv-1004",
    qrPayment: true,
    pdfReceipt: false,
    memo: "Awaiting treasury approval",
    createdAt: "2026-07-07T12:00:00.000Z"
  },
  {
    id: "v2-inv-1005",
    customerId: "cus-stf-003",
    orderId: "ord-1005",
    direction: "receivable",
    merchantName: STFLOW_WORKSPACE_NAME,
    merchantWallet: STFLOW_WORKSPACE_WALLET,
    payerName: "Meridian Labs",
    payerWallet: "0xB98E7D6C5B4A39281706F5E4D3C2B1A098765432",
    title: "Builder toolkit license",
    amount: 525,
    currency: "USDC",
    status: "pending",
    paymentLink: "/pay/v2-inv-1005",
    qrPayment: true,
    pdfReceipt: false,
    memo: "Mobile QR payment enabled",
    createdAt: "2026-07-07T15:20:00.000Z"
  },
  {
    id: "v2-inv-1006",
    customerId: "cus-stf-004",
    orderId: "ord-1004",
    direction: "receivable",
    merchantName: STFLOW_WORKSPACE_NAME,
    merchantWallet: STFLOW_WORKSPACE_WALLET,
    payerName: "Greenline Treasury",
    payerWallet: "0xA12F8E7D5C4B3A2918076F5E4D3C2B1A09876543",
    title: "Treasury setup draft",
    amount: 1800,
    currency: "USDC",
    status: "draft",
    paymentLink: "/pay/v2-inv-1006",
    qrPayment: false,
    pdfReceipt: false,
    memo: "Draft before approval",
    createdAt: "2026-07-08T09:00:00.000Z"
  },
  {
    id: "v2-inv-0999",
    customerId: "cus-stf-003",
    orderId: "ord-1005",
    direction: "receivable",
    merchantName: STFLOW_WORKSPACE_NAME,
    merchantWallet: STFLOW_WORKSPACE_WALLET,
    payerName: "Meridian Labs",
    payerWallet: "0xB98E7D6C5B4A39281706F5E4D3C2B1A098765432",
    title: "Closed builder quote",
    amount: 625,
    currency: "USDC",
    status: "archived",
    paymentLink: "/pay/v2-inv-0999",
    qrPayment: false,
    pdfReceipt: false,
    memo: "Replaced by v2-inv-1005",
    createdAt: "2026-06-24T08:30:00.000Z"
  },
  {
    id: "v2-inv-2001",
    customerId: "cus-stflow-001",
    orderId: "ord-2001",
    direction: "payable",
    merchantName: "Vector Audit Studio",
    merchantWallet: "0x3F2a9c4D8E1b66Fa5F839412BB0E4c1D92d3e810",
    payerName: STFLOW_WORKSPACE_NAME,
    payerWallet: STFLOW_WORKSPACE_WALLET,
    title: "Proof integration review",
    amount: 740,
    currency: "USDC",
    status: "pending",
    paymentLink: "/pay/v2-inv-2001",
    qrPayment: true,
    pdfReceipt: false,
    memo: "Invoice received from an external merchant; STFlow wallet is the payer.",
    createdAt: "2026-07-09T10:30:00.000Z"
  },
  {
    id: "v2-inv-2002",
    customerId: "cus-stflow-001",
    orderId: "ord-2002",
    direction: "payable",
    merchantName: "Protocol Ops Lab",
    merchantWallet: "0x519a72Ff0cB8E95f688C56c81E0A2dD29f0D8821",
    payerName: STFLOW_WORKSPACE_NAME,
    payerWallet: STFLOW_WORKSPACE_WALLET,
    title: "Security audit memo",
    amount: 1180,
    currency: "USDC",
    status: "draft",
    paymentLink: "/pay/v2-inv-2002",
    qrPayment: false,
    pdfReceipt: false,
    memo: "Reserved for the future Payables Inbox flow.",
    createdAt: "2026-07-10T08:15:00.000Z"
  }
];

export const v2Activities: V2Activity[] = [
  {
    id: "act-1001",
    label: "Invoice paid",
    detail: "Helio Studio paid 3,150 USDC",
    status: "success",
    createdAt: "2026-07-06T10:24:00.000Z"
  },
  {
    id: "act-1002",
    label: "QR payment enabled",
    detail: "Builder toolkit invoice received a mobile QR link",
    status: "info",
    createdAt: "2026-07-07T15:22:00.000Z"
  },
  {
    id: "act-1003",
    label: "Pending treasury approval",
    detail: "Greenline Treasury has a pending 1,800 USDC invoice",
    status: "pending",
    createdAt: "2026-07-07T12:00:00.000Z"
  }
];

export function getV2InvoicesByStatus(status: V2InvoiceStatus) {
  return v2Invoices.filter((invoice) => invoice.status === status);
}

export function getV2InvoicesByDirection(direction: V2InvoiceDirection) {
  return v2Invoices.filter((invoice) => invoice.direction === direction);
}

export function getV2CustomerName(customerId: string) {
  return v2Customers.find((customer) => customer.id === customerId)?.name ?? "Unknown customer";
}

export function getV2OrderTitle(orderId: string) {
  return v2Orders.find((order) => order.id === orderId)?.title ?? "Unknown order";
}

export function getV2ConsoleSummary() {
  const receivableInvoices = getV2InvoicesByDirection("receivable");
  const payableInvoices = getV2InvoicesByDirection("payable");
  const activeInvoices = v2Invoices.filter((invoice) => invoice.status !== "archived");
  const paidInvoices = getV2InvoicesByStatus("paid");
  const pendingInvoices = getV2InvoicesByStatus("pending");
  const statusCounts = v2Invoices.reduce(
    (counts, invoice) => ({ ...counts, [invoice.status]: counts[invoice.status] + 1 }),
    { draft: 0, pending: 0, paid: 0, archived: 0 } satisfies Record<V2InvoiceStatus, number>
  );

  return {
    totalInvoices: v2Invoices.length,
    totalCustomers: v2Customers.length,
    totalOrders: v2Orders.length,
    totalReceived: paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    pendingAmount: pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    receivableCount: receivableInvoices.length,
    payableCount: payableInvoices.length,
    receivableAmount: receivableInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    payableAmount: payableInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    activeInvoiceValue: activeInvoices.reduce((sum, invoice) => sum + invoice.amount, 0),
    statusCounts
  };
}

export function getV2Analytics() {
  const summary = getV2ConsoleSummary();
  const paidInvoices = getV2InvoicesByStatus("paid");
  const nonArchivedCount = v2Invoices.filter((invoice) => invoice.status !== "archived" && invoice.status !== "draft").length;

  return {
    successRate: nonArchivedCount ? Math.round((paidInvoices.length / nonArchivedCount) * 100) : 0,
    averagePaidInvoice: paidInvoices.length
      ? Number((summary.totalReceived / paidInvoices.length).toFixed(2))
      : 0,
    topCustomer: [...v2Customers].sort((a, b) => b.totalPaid - a.totalPaid)[0],
    qrEnabledInvoices: v2Invoices.filter((invoice) => invoice.qrPayment).length,
    pdfReadyReceipts: v2Invoices.filter((invoice) => invoice.pdfReceipt).length
  };
}

export function buildV2Csv() {
  const header = "Invoice ID,Direction,Merchant,Payer,Order,Status,Amount,Currency,Created At";
  const rows = v2Invoices.map((invoice) =>
    [
      invoice.id,
      invoice.direction,
      invoice.merchantName,
      invoice.payerName,
      getV2OrderTitle(invoice.orderId),
      invoice.status,
      invoice.amount,
      invoice.currency,
      invoice.createdAt
    ].join(",")
  );

  return [header, ...rows].join("\n");
}

function buildV2AuditTimeline(invoice: V2Invoice): V2AuditTimelineItem[] {
  return [
    {
      id: "created",
      label: "Invoice created",
      detail: "Invoice object created with customer, order, amount, and memo fields.",
      state: "complete",
      timestamp: invoice.createdAt
    },
    {
      id: "payment-link",
      label: "Payment link generated",
      detail: `Checkout URL reserved at ${invoice.paymentLink}.`,
      state: invoice.status === "draft" ? "pending" : "complete",
      timestamp: invoice.createdAt
    },
    {
      id: "qr-payment",
      label: "QR payment prepared",
      detail: invoice.qrPayment
        ? "Mobile QR entry is enabled for this invoice."
        : "QR payment is reserved for a later invoice state.",
      state: invoice.qrPayment ? "complete" : "reserved"
    },
    {
      id: "payment-confirmed",
      label: "USDC payment confirmed",
      detail: invoice.txHash
        ? `Mock proof hash ${invoice.txHash}.`
        : "Waiting for mock or real USDC transfer confirmation.",
      state: invoice.status === "paid" ? "complete" : "pending",
      timestamp: invoice.paidAt
    },
    {
      id: "receipt-issued",
      label: "Receipt issued",
      detail: invoice.pdfReceipt
        ? "Receipt data is ready for PDF export and audit record."
        : "Receipt data will be issued after payment confirmation.",
      state: invoice.pdfReceipt ? "complete" : "reserved",
      timestamp: invoice.paidAt
    }
  ];
}

export function getV2InvoiceDetail(invoiceId: string): V2InvoiceDetail | null {
  const invoice = v2Invoices.find((item) => item.id === invoiceId);
  if (!invoice) return null;

  const customer = v2Customers.find((item) => item.id === invoice.customerId);
  const order = v2Orders.find((item) => item.id === invoice.orderId);

  if (!customer || !order) return null;

  return {
    invoice,
    customer,
    order,
    timeline: buildV2AuditTimeline(invoice)
  };
}

export function getV2InvoiceAsInvoice(invoiceId: string): Invoice | null {
  const invoice = v2Invoices.find((item) => item.id === invoiceId);

  if (!invoice || invoice.status === "draft" || invoice.status === "archived") {
    return null;
  }

  return {
    id: invoice.id,
    merchantWallet: invoice.merchantWallet,
    customerName: invoice.payerName,
    customerWallet: invoice.payerWallet,
    payerWallet: invoice.status === "paid" ? invoice.payerWallet : undefined,
    title: invoice.title,
    memo: invoice.memo,
    amount: String(invoice.amount),
    currency: "USDC",
    status: invoice.status,
    paymentTxHash: invoice.txHash,
    chainId: ARC_TESTNET.chainId,
    createdAt: invoice.createdAt,
    paidAt: invoice.paidAt
  };
}
