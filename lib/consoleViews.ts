import type { Invoice, InvoiceStatus } from "../types/invoice.ts";
import { getConsoleInvoiceData } from "./consoleInvoiceData.ts";
import { parseUsdc } from "./format.ts";

export type InvoiceDirection = "receivable" | "payable";

export type CustomerRow = {
  wallet: string;
  name?: string;
  relationship: InvoiceDirection | "both";
  invoiceCount: number;
  pendingAmount: bigint;
  settledAmount: bigint;
};

export type OrderRow = {
  invoice: Invoice;
  direction: InvoiceDirection;
  counterparty: string;
};

const statuses: InvoiceStatus[] = ["pending", "paid", "expired", "cancelled"];

function normalized(value?: string) {
  return value?.trim().toLowerCase();
}

export function orderRows(invoices: Invoice[], wallet?: string | null): OrderRow[] {
  const { receivables, payables } = getConsoleInvoiceData(invoices, wallet);
  return [
    ...receivables.map((invoice) => ({
      invoice,
      direction: "receivable" as const,
      counterparty: normalized(invoice.customerWallet || invoice.payerWallet) ?? ""
    })),
    ...payables.map((invoice) => ({
      invoice,
      direction: "payable" as const,
      counterparty: normalized(invoice.merchantWallet) ?? ""
    }))
  ].sort((left, right) => Date.parse(right.invoice.createdAt) - Date.parse(left.invoice.createdAt));
}

export function customerRows(invoices: Invoice[], wallet?: string | null): CustomerRow[] {
  const rows = new Map<string, CustomerRow>();
  for (const order of orderRows(invoices, wallet)) {
    if (!order.counterparty) continue;
    const current = rows.get(order.counterparty);
    const name = order.direction === "receivable" ? order.invoice.customerName : undefined;
    const amount = parseUsdc(order.invoice.amount);
    if (!current) {
      rows.set(order.counterparty, {
        wallet: order.counterparty,
        name,
        relationship: order.direction,
        invoiceCount: 1,
        pendingAmount: order.invoice.status === "pending" ? amount : 0n,
        settledAmount: order.invoice.status === "paid" ? amount : 0n
      });
      continue;
    }
    current.name ??= name;
    current.invoiceCount += 1;
    if (current.relationship !== order.direction) current.relationship = "both";
    if (order.invoice.status === "pending") current.pendingAmount += amount;
    if (order.invoice.status === "paid") current.settledAmount += amount;
  }
  return [...rows.values()].sort((left, right) => right.invoiceCount - left.invoiceCount);
}

export function invoiceAnalytics(invoices: Invoice[], wallet?: string | null) {
  const orders = orderRows(invoices, wallet);
  const status = Object.fromEntries(
    statuses.map((value) => [value, { count: 0, amount: 0n }])
  ) as Record<InvoiceStatus, { count: number; amount: bigint }>;
  let receivableAmount = 0n;
  let payableAmount = 0n;
  for (const order of orders) {
    const amount = parseUsdc(order.invoice.amount);
    status[order.invoice.status].count += 1;
    status[order.invoice.status].amount += amount;
    if (order.direction === "receivable") receivableAmount += amount;
    else payableAmount += amount;
  }
  return {
    totalInvoices: orders.length,
    receivableAmount,
    payableAmount,
    status
  };
}

function csvValue(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

export function invoiceCsv(invoices: Invoice[], wallet?: string | null) {
  const header = [
    "Invoice ID",
    "Direction",
    "Merchant",
    "Payer",
    "Title",
    "Amount",
    "Currency",
    "Status",
    "Created At",
    "Due At",
    "Paid At"
  ];
  const rows = orderRows(invoices, wallet).map(({ invoice, direction }) => [
    invoice.id,
    direction,
    invoice.merchantWallet,
    invoice.customerWallet || invoice.payerWallet || "",
    invoice.title || "",
    invoice.amount,
    invoice.currency,
    invoice.status,
    invoice.createdAt,
    invoice.expiresAt || "",
    invoice.paidAt || ""
  ]);
  return [header, ...rows].map((row) => row.map(csvValue).join(",")).join("\r\n");
}
