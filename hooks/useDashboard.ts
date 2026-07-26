"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { filterInvoicesByMerchant, filterInvoicesByPayer } from "@/lib/invoice";
import { MOCK_MERCHANT_A } from "@/lib/mockData";
import { getPaymentMode, isLivePaymentMode } from "@/lib/paymentMode";
import { useInvoices } from "./useInvoice";

export function useDashboard() {
  const { invoices, isReady } = useInvoices();
  const { address: connectedAddress, isConnected } = useAccount();
  const paymentMode = getPaymentMode();
  const livePayment = isLivePaymentMode(paymentMode);
  const address = livePayment && connectedAddress ? connectedAddress : MOCK_MERCHANT_A;

  const merchantInvoices = useMemo(
    () => filterInvoicesByMerchant(invoices, address),
    [invoices, address]
  );

  const incomingInvoices = useMemo(
    () => filterInvoicesByPayer(invoices, address).filter((invoice) => invoice.status === "pending"),
    [invoices, address]
  );

  const stats = useMemo(() => {
    const paid = merchantInvoices.filter((invoice) => invoice.status === "paid");
    const pending = merchantInvoices.filter((invoice) => invoice.status === "pending");

    return {
      totalReceived: paid.reduce((sum, invoice) => sum + Number(invoice.amount), 0),
      paidInvoices: paid.length,
      pendingInvoices: pending.length,
      totalVolume: merchantInvoices.reduce((sum, invoice) => sum + Number(invoice.amount), 0)
    };
  }, [merchantInvoices]);

  return {
    address,
    isConnected: livePayment ? isConnected : true,
    livePayment,
    paymentMode,
    invoices: merchantInvoices,
    incomingInvoices,
    isReady,
    allInvoices: invoices,
    stats
  };
}
