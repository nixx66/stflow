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
    [address, invoices]
  );

  const incomingInvoices = useMemo(
    () => filterInvoicesByPayer(invoices, address).filter((invoice) => invoice.status === "pending"),
    [address, invoices]
  );

  const stats = useMemo(() => {
    const paid = merchantInvoices.filter((invoice) => invoice.status === "paid");
    const pending = merchantInvoices.filter((invoice) => invoice.status === "pending");
    const totalReceived = paid.reduce((sum, invoice) => sum + Number(invoice.amount), 0);
    const totalVolume = merchantInvoices.reduce(
      (sum, invoice) => sum + Number(invoice.amount),
      0
    );

    return {
      totalReceived,
      paidInvoices: paid.length,
      pendingInvoices: pending.length,
      totalVolume
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
