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

function saveInvoice(invoice: Invoice) {
  const storedInvoices = getStoredInvoices();
  saveStoredInvoices([invoice, ...storedInvoices.filter((item) => item.id !== invoice.id)]);
}

export function useInvoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    const refresh = () => {
      try {
        const storedInvoices = getStoredInvoices();
        if (active) {
          setInvoices(storedInvoices);
        }
        storedInvoices.forEach((invoice) => {
          void syncInvoiceToServer(invoice);
        });
      } finally {
        if (active) {
          setIsReady(true);
        }
      }
    };

    const loadServerInvoices = async () => {
      const serverInvoices = await fetchInvoicesFromServer();
      if (!active || serverInvoices.length === 0) return;

      setInvoices((current) => mergeInvoicesById(serverInvoices, current));
      setIsReady(true);
    };

    refresh();
    void loadServerInvoices();
    window.addEventListener("storage", refresh);
    window.addEventListener("stflow:invoices", refresh);

    return () => {
      active = false;
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

    saveInvoice(sharedInvoice);
  }, [invoices, isReady, sharedInvoice]);

  const localInvoice = useMemo(() => {
    return invoices.find((item) => item.id === invoiceId) ?? getInvoiceById(invoiceId) ?? sharedInvoice ?? undefined;
  }, [invoiceId, invoices, sharedInvoice]);

  useEffect(() => {
    if (!isReady || localInvoice) return;

    let active = true;
    setIsFetchingRemote(true);

    fetchInvoiceFromServer(invoiceId)
      .then((invoice) => {
        if (!active) return;
        setRemoteInvoice(invoice);

        if (invoice) {
          saveInvoice(invoice);
        }
      })
      .catch(() => {
        if (active) setRemoteInvoice(null);
      })
      .finally(() => {
        if (active) setIsFetchingRemote(false);
      });

    return () => {
      active = false;
    };
  }, [invoiceId, isReady, localInvoice]);

  const invoice = localInvoice ?? remoteInvoice ?? undefined;

  return { invoice, isReady: isReady && !isFetchingRemote };
}
