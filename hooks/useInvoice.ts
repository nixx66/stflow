"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CreateInvoiceInput,
  createMockInvoice,
  getInvoiceById,
  getStoredInvoices,
  mergeInvoicesById,
  saveStoredInvoices
} from "@/lib/invoice";
import {
  fetchInvoiceFromServer,
  fetchInvoicesFromServer,
  syncInvoiceToServer
} from "@/lib/invoiceServerClient";
import { decodeSharedInvoice } from "@/lib/sharedInvoiceLink";
import { Invoice } from "@/types/invoice";

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isCurrent = true;

    const refresh = () => {
      try {
        const storedInvoices = getStoredInvoices();
        if (isCurrent) {
          setInvoices(storedInvoices);
        }
        storedInvoices.forEach((invoice) => {
          void syncInvoiceToServer(invoice);
        });
      } finally {
        if (isCurrent) {
          setIsReady(true);
        }
      }
    };

    const refreshServerInvoices = async () => {
      const serverInvoices = await fetchInvoicesFromServer();
      if (!isCurrent || serverInvoices.length === 0) return;

      setInvoices((currentInvoices) => mergeInvoicesById(serverInvoices, currentInvoices));
      setIsReady(true);
    };

    refresh();
    void refreshServerInvoices();
    window.addEventListener("storage", refresh);
    window.addEventListener("stflow:invoices", refresh);

    return () => {
      isCurrent = false;
      window.removeEventListener("storage", refresh);
      window.removeEventListener("stflow:invoices", refresh);
    };
  }, []);

  const createInvoice = (input: CreateInvoiceInput) => {
    const invoice = createMockInvoice(input);
    void syncInvoiceToServer(invoice);
    setInvoices(getStoredInvoices());
    setIsReady(true);
    return invoice;
  };

  return { invoices, createInvoice, isReady };
}

export function useInvoice(invoiceId: string, sharedInvoicePayload?: string | null) {
  const { invoices, isReady } = useInvoices();
  const [remoteInvoice, setRemoteInvoice] = useState<Invoice | null>(null);
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);
  const sharedInvoice = useMemo(
    () => decodeSharedInvoice(sharedInvoicePayload, invoiceId),
    [invoiceId, sharedInvoicePayload]
  );

  useEffect(() => {
    if (!isReady || !sharedInvoice) return;
    if (invoices.some((item) => item.id === sharedInvoice.id)) return;

    const storedInvoices = getStoredInvoices();
    saveStoredInvoices([
      sharedInvoice,
      ...storedInvoices.filter((item) => item.id !== sharedInvoice.id)
    ]);
  }, [invoices, isReady, sharedInvoice]);

  const localInvoice = useMemo(() => {
    return invoices.find((item) => item.id === invoiceId) ?? getInvoiceById(invoiceId) ?? sharedInvoice ?? undefined;
  }, [invoiceId, invoices, sharedInvoice]);

  useEffect(() => {
    if (!isReady || localInvoice) return;

    let isCurrent = true;
    setIsFetchingRemote(true);

    fetchInvoiceFromServer(invoiceId)
      .then((invoice) => {
        if (!isCurrent) return;
        setRemoteInvoice(invoice);

        if (invoice) {
          const storedInvoices = getStoredInvoices();
          saveStoredInvoices([
            invoice,
            ...storedInvoices.filter((item) => item.id !== invoice.id)
          ]);
        }
      })
      .catch(() => {
        if (isCurrent) setRemoteInvoice(null);
      })
      .finally(() => {
        if (isCurrent) setIsFetchingRemote(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [invoiceId, isReady, localInvoice]);

  const invoice = localInvoice ?? remoteInvoice ?? undefined;

  return { invoice, isReady: isReady && !isFetchingRemote };
}
