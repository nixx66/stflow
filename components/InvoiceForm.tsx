"use client";

import { CheckCircle2, Link2, ShieldCheck } from "lucide-react";
import { FormEvent, useMemo, useRef, useState } from "react";
import { getAddress } from "viem";
import { useAccount } from "wagmi";
import { useCreateInvoice, type MetadataRecovery } from "@/hooks/useCreateInvoice";
import { isValidInvoiceWalletAddress } from "@/lib/invoiceCreateReadiness";
import { createReferenceId } from "@/lib/invoiceCreateTransaction";
import { buildSharedInvoicePayUrl } from "@/lib/sharedInvoiceLink";
import { getMerchantWalletDisplay } from "@/lib/walletDisplay";
import { Invoice } from "@/types/invoice";
import { InvoiceCreated } from "./invoice/InvoiceCreated";
import { InvoiceFields, InvoiceFormValues } from "./invoice/InvoiceFields";

const trustItems = [
  {
    title: "On-chain by design",
    body: "Every invoice is live-ready and verifiable.",
    icon: Link2
  },
  {
    title: "Secure and transparent",
    body: "Built for stablecoin settlement records.",
    icon: ShieldCheck
  },
  {
    title: "Instant tracking",
    body: "Payment, receipt, and dashboard stay connected.",
    icon: CheckCircle2
  }
] as const;

const initialForm: InvoiceFormValues = {
  customerName: "Builder team",
  customerWallet: "",
  title: "USDC checkout invoice",
  amount: "250",
  description: "Stablecoin checkout payment for settlement tracking.",
  memo: "Thanks for your payment.",
  expiresAt: ""
};

export function InvoiceForm() {
  const { createInvoice, configError, retryMetadata, state } = useCreateInvoice();
  const { address: connectedMerchantWallet } = useAccount();
  const merchantWalletDisplay = getMerchantWalletDisplay({
    connectedWallet: connectedMerchantWallet,
    livePayment: true
  });
  const [createdInvoice, setCreatedInvoice] = useState<Invoice>();
  const [metadataPending, setMetadataPending] = useState(false);
  const [creationTxHash, setCreationTxHash] = useState<string>();
  const [formError, setFormError] = useState<string>();
  const [metadataRecovery, setMetadataRecovery] = useState<MetadataRecovery>();
  const [retryingMetadata, setRetryingMetadata] = useState(false);
  const [form, setForm] = useState(initialForm);
  const latestRequest = useRef<string | undefined>(undefined);
  const formBusy = useRef(false);

  const paymentLink = useMemo(() => {
    if (!createdInvoice || typeof window === "undefined") return "";
    return buildSharedInvoicePayUrl(window.location.origin, createdInvoice);
  }, [createdInvoice]);

  const minExpireAt = useMemo(() => {
    const date = new Date();
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset() + 1);
    return date.toISOString().slice(0, 16);
  }, []);

  const change = (name: keyof InvoiceFormValues, value: string) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (formBusy.current) return;

    setFormError(undefined);

    if (form.expiresAt && new Date(form.expiresAt).getTime() <= Date.now()) {
      setFormError("Payment deadline must be later than the current time.");
      return;
    }

    if (configError) {
      setFormError(configError);
      return;
    }

    if (!connectedMerchantWallet) {
      setFormError("Connect the merchant wallet before creating an invoice.");
      return;
    }

    const payerWallet = form.customerWallet.trim();

    if (!payerWallet) {
      setFormError("Enter the payer wallet so this invoice can appear in the payer dashboard.");
      return;
    }

    if (!isValidInvoiceWalletAddress(payerWallet)) {
      setFormError("Enter a valid EVM payer wallet address.");
      return;
    }

    if (payerWallet.toLowerCase() === connectedMerchantWallet.toLowerCase()) {
      setFormError("Payer wallet must be different from the merchant wallet.");
      return;
    }

    const requestId = createReferenceId();
    latestRequest.current = requestId;
    formBusy.current = true;
    setCreatedInvoice(undefined);
    setCreationTxHash(undefined);
    setMetadataPending(false);

    try {
      const result = await createInvoice(
        {
          payer: getAddress(payerWallet),
          customerName: form.customerName,
          title: form.title,
          amount: form.amount,
          description: form.description,
          memo: form.memo,
          expiresAt: form.expiresAt
        },
        requestId
      );
      if (latestRequest.current !== result.requestId) return;

      setCreatedInvoice(result.invoice);
      setCreationTxHash(result.txHash);
      setMetadataPending(result.metadataPending);
      setMetadataRecovery(result.metadataRecovery);
    } catch (error) {
      if (latestRequest.current !== requestId) return;
      setFormError(error instanceof Error ? error.message : "Unable to create the invoice.");
    } finally {
      if (latestRequest.current === requestId) {
        formBusy.current = false;
      }
    }
  };

  const retrySave = async () => {
    if (!metadataRecovery || retryingMetadata) return;
    setRetryingMetadata(true);
    setFormError(undefined);
    try {
      await retryMetadata(metadataRecovery);
      setMetadataPending(false);
    } catch (error) {
      setMetadataPending(true);
      setFormError(
        error instanceof Error ? error.message : "Unable to save invoice metadata."
      );
    } finally {
      setRetryingMetadata(false);
    }
  };

  const submitting =
    state.stage === "signing" ||
    state.stage === "confirming" ||
    state.stage === "persisting";
  const displayedError = formError ?? configError;

  return (
    <div className="sf-invoice-shell mx-auto max-w-[1680px] rounded-[2.5rem] border border-white/60 bg-white/35 p-3 shadow-[0_40px_120px_rgba(4,41,31,0.12)] backdrop-blur-2xl">
      <form className="relative z-10 grid gap-4 lg:grid-cols-[0.72fr_1.28fr]" onSubmit={submit}>
        <aside className="relative overflow-hidden rounded-[2.15rem] border border-white/70 bg-[linear-gradient(150deg,rgba(255,255,255,0.88),rgba(231,248,236,0.54)_52%,rgba(255,248,232,0.82))] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_26px_70px_rgba(4,41,31,0.08)] sm:p-7">
          <div className="sf-wave-field pointer-events-none absolute inset-x-0 bottom-0 h-56 opacity-80" />
          <div className="pointer-events-none absolute -left-20 bottom-8 h-52 w-52 rounded-full bg-[#a8ef72]/20 blur-3xl" />
          <div className="relative z-10 flex min-h-full flex-col">
            <span className="w-fit rounded-full bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#0fa86b] ring-1 ring-white/80">
              Invoices
            </span>
            <h1 className="mt-6 max-w-md text-4xl font-black leading-[0.95] tracking-tight text-[#063f2c] sm:text-5xl xl:text-6xl">
              Create your invoice
            </h1>
            <p className="mt-5 max-w-md text-sm font-semibold leading-7 text-[#667085]">
              Add the merchant wallet, payer, amount, and payment details. STFlow turns the invoice into a payment link, receipt, and dashboard record.
            </p>

            <div className="mt-6 grid gap-3 rounded-[1.4rem] border border-white/75 bg-white/60 p-3 shadow-[0_18px_55px_rgba(4,41,31,0.06)] backdrop-blur-xl">
              {trustItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div className="sf-hover flex items-start gap-3 rounded-2xl bg-white/70 p-3" key={item.title}>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#e7f8ec] text-[#0fa86b] ring-1 ring-[#c9ecd3]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-sm font-black text-[#063f2c]">{item.title}</p>
                      <p className="mt-1 text-xs font-bold leading-5 text-muted">{item.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative mt-auto hidden min-h-48 items-center justify-center pt-8 lg:flex">
              <div className="sf-orb-pulse flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border border-white/70 bg-white/55 shadow-[0_30px_80px_rgba(15,168,107,0.24)] backdrop-blur-xl">
                <img
                  alt="USDC coin"
                  className="h-full w-full object-cover"
                  src="/usdc-coin.png"
                />
              </div>
            </div>
          </div>
        </aside>

        <InvoiceFields
          change={change}
          disabled={Boolean(configError) || submitting}
          form={form}
          formError={displayedError}
          merchantWalletDisplay={merchantWalletDisplay}
          minExpireAt={minExpireAt}
          submitLabel={
            state.stage === "signing"
              ? "Confirm in wallet"
              : state.stage === "confirming"
                ? "Confirming on Arc"
                : state.stage === "persisting"
                  ? "Saving invoice metadata"
                : "Create invoice"
          }
        />
        <InvoiceCreated
          invoice={createdInvoice}
          metadataPending={metadataPending}
          onRetryMetadata={retrySave}
          paymentLink={paymentLink}
          retryingMetadata={retryingMetadata}
          txHash={creationTxHash}
        />
      </form>
    </div>
  );
}
