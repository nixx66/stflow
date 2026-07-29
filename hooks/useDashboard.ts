"use client";

import { useMemo } from "react";
import { useAccount } from "wagmi";
import { filterInvoicesByMerchant, filterInvoicesByPayer } from "@/lib/invoice";
import { parseUsdc } from "@/lib/format";
import { useInvoices } from "./useInvoice";

export function useDashboard() {
  const { invoices: allInvoices, isReady, status, error, refresh } = useInvoices();
  const { address, isConnected } = useAccount();
  const invoices = useMemo(
    () => filterInvoicesByMerchant(allInvoices, address),
    [allInvoices, address]
  );
  const incomingInvoices = useMemo(
    () =>
      filterInvoicesByPayer(allInvoices, address).filter(
        (invoice) => invoice.status === "pending"
      ),
    [allInvoices, address]
  );
  const stats = useMemo(() => {
    const paid = invoices.filter((invoice) => invoice.status === "paid");
    const pending = invoices.filter((invoice) => invoice.status === "pending");
    return {
      totalReceived: paid.reduce((sum, invoice) => sum + parseUsdc(invoice.amount), 0n),
      paidInvoices: paid.length,
      pendingInvoices: pending.length,
      totalVolume: invoices.reduce((sum, invoice) => sum + parseUsdc(invoice.amount), 0n)
    };
  }, [invoices]);

  return {
    address,
    isConnected,
    invoices,
    incomingInvoices,
    allInvoices,
    isReady,
    status,
    error,
    refresh,
    stats
  };
}
