"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  getAccount,
  getBytecode,
  getChainId,
  readContract,
  switchChain,
  waitForTransactionReceipt,
  writeContract
} from "wagmi/actions";
import {
  bytesToHex,
  createPublicClient,
  getAddress,
  http,
  isAddressEqual,
  type Address,
  type Hex
} from "viem";
import { useAccount, useConfig } from "wagmi";
import { ARC_TESTNET } from "@/lib/arc";
import { arcTestnet } from "@/lib/chains";
import { hashInvoiceMetadata, type InvoiceMetadata } from "@/lib/invoiceMetadata";
import {
  beginPayment,
  classifyMetadataResponse,
  formatUsdc,
  getPaymentPlan,
  invoicePaidEvent,
  isCurrentInvoiceLoad,
  normalizeInvoiceId,
  reducePaymentState,
  resolvePaymentProof,
  selectInvoiceScope,
  validateConfirmedPayment,
  validateInvoicePaid,
  validatePaymentSnapshot,
  validatePaymentWrite,
  validateRegistryUsdc,
  type ChainInvoice,
  type PaymentState
} from "@/lib/paymentTransaction";
import { USDC_ADDRESS, usdcAbi } from "@/lib/usdc";

const initialState: PaymentState = { stage: "idle" };
const arcClient = createPublicClient({ chain: arcTestnet, transport: http() });

export type PaymentProof =
  | { invoiceId: Hex; status: "idle" | "loading" }
  | { invoiceId: Hex; status: "verified"; txHash: Hex }
  | { invoiceId: Hex; status: "error"; error: string };

function message(error: unknown) {
  return error instanceof Error ? error.message : "Unable to pay this invoice.";
}

function requestId(): Hex {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

function parseInvoiceId(value: string): Hex {
  return normalizeInvoiceId(value);
}

function accountSnapshot(config: Parameters<typeof getAccount>[0]) {
  const account = getAccount(config);
  return { address: account.address, chainId: getChainId(config) };
}

type Metadata = InvoiceMetadata;

async function getVerifiedMetadata(id: Hex, expectedHash: Hex) {
  const response = await fetch(`/api/v1/invoices/${id}`, { cache: "no-store" });
  const availability = classifyMetadataResponse(response.status);
  if (availability === "missing") return undefined;
  if (availability === "retryable-error") {
    throw new Error("Invoice metadata is temporarily unavailable.");
  }

  const payload = (await response.json()) as { metadata?: Metadata };
  if (!payload.metadata || hashInvoiceMetadata(payload.metadata) !== expectedHash) {
    throw new Error("Invoice metadata does not match its onchain hash.");
  }
  return payload.metadata;
}

export function usePayInvoice(invoiceId: string, receiptHash?: Hex) {
  const config = useConfig();
  const { address, isConnected } = useAccount();
  const [state, dispatch] = useReducer(reducePaymentState, initialState);
  const [invoice, setInvoice] = useState<ChainInvoice>();
  const [metadata, setMetadata] = useState<Metadata>();
  const [loadError, setLoadError] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [loadedInvoiceId, setLoadedInvoiceId] = useState<Hex>();
  const [metadataInvoiceId, setMetadataInvoiceId] = useState<Hex>();
  const [loadErrorInvoiceId, setLoadErrorInvoiceId] = useState<Hex>();
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<Hex>();
  const [proof, setProof] = useState<PaymentProof>();
  const activeRequest = useRef<Hex | undefined>(undefined);
  const loadGeneration = useRef(0);
  const invoiceKey = useRef<Hex | undefined>(undefined);
  try {
    invoiceKey.current = parseInvoiceId(invoiceId);
  } catch {
    invoiceKey.current = undefined;
  }

  const load = useCallback(async () => {
    const generation = ++loadGeneration.current;
    let id: Hex;
    try {
      id = parseInvoiceId(invoiceId);
    } catch (error) {
      setInvoice(undefined);
      setMetadata(undefined);
      setProof(undefined);
      setLoadError(message(error));
      setIsLoading(false);
      return;
    }
    const token = { invoiceId: id, generation };
    invoiceKey.current = id;
    const current = () =>
      isCurrentInvoiceLoad(token, invoiceKey.current ?? id, loadGeneration.current);

    setIsLoading(true);
    setLoadingInvoiceId(id);
    setLoadError(undefined);
    setLoadErrorInvoiceId(undefined);
    setProof({ invoiceId: id, status: "idle" });

    try {
      const { INVOICE_REGISTRY_ADDRESS, invoiceRegistryAbi } = await import(
        "@/lib/contracts/invoiceRegistry"
      );
      const chainInvoice = (await readContract(config, {
        address: INVOICE_REGISTRY_ADDRESS,
        abi: invoiceRegistryAbi,
        functionName: "getInvoice",
        args: [id],
        chainId: ARC_TESTNET.chainId
      })) as ChainInvoice;
      if (normalizeInvoiceId(chainInvoice.id) !== id) {
        throw new Error("Registry returned a different invoice ID.");
      }

      if (!current()) return;
      setInvoice(chainInvoice);
      setLoadedInvoiceId(id);
      try {
        const verified = await getVerifiedMetadata(id, chainInvoice.metadataHash);
        if (current()) {
          setMetadata(verified);
          setMetadataInvoiceId(id);
        }
      } catch (error) {
        if (current()) {
          setMetadata(undefined);
          setMetadataInvoiceId(id);
          setLoadError(message(error));
          setLoadErrorInvoiceId(id);
        }
      }

      if (chainInvoice.status === 1 && current()) {
        setProof({ invoiceId: id, status: "loading" });
        try {
          const hashes = receiptHash
            ? [receiptHash]
            : (
                await arcClient.getLogs({
                  address: INVOICE_REGISTRY_ADDRESS,
                  event: invoicePaidEvent,
                  args: { id: chainInvoice.id },
                  fromBlock: "earliest",
                  toBlock: "latest"
                })
              ).map((log) => log.transactionHash);
          const result = await resolvePaymentProof(
            hashes,
            (hash) => arcClient.getTransactionReceipt({ hash }),
            INVOICE_REGISTRY_ADDRESS,
            {
              id: chainInvoice.id,
              payer: chainInvoice.payer,
              merchant: chainInvoice.merchant,
              amount: chainInvoice.amount
            }
          );
          if (current()) setProof({ invoiceId: id, ...result });
        } catch {
          if (current()) {
            setProof({
              invoiceId: id,
              status: "error",
              error: "Payment proof could not be verified. Retry shortly."
            });
          }
        }
      }
    } catch (error) {
      if (current()) {
        setInvoice(undefined);
        setMetadata(undefined);
        setLoadError(message(error));
        setLoadErrorInvoiceId(id);
        setProof(undefined);
      }
    } finally {
      if (current()) setIsLoading(false);
    }
  }, [config, invoiceId, receiptHash]);

  useEffect(() => {
    try {
      const id = parseInvoiceId(invoiceId);
      invoiceKey.current = id;
      dispatch({ type: "reset", invoiceId: id });
    } catch {
      invoiceKey.current = undefined;
    }
    setInvoice(undefined);
    setLoadedInvoiceId(undefined);
    setMetadata(undefined);
    setMetadataInvoiceId(undefined);
    setProof(undefined);
    setLoadError(undefined);
    setLoadErrorInvoiceId(undefined);
    void load();
  }, [load]);

  const pay = useCallback(async () => {
    const paymentRequest = requestId();
    let ownsRequest = false;

    try {
      const id = parseInvoiceId(invoiceId);
      if (invoiceKey.current !== id) {
        return { error: "Invoice changed before payment preparation." };
      }
      const acquisition = beginPayment(activeRequest.current, paymentRequest);
      if (!acquisition.acquired) return { error: acquisition.error };

      ownsRequest = true;
      activeRequest.current = acquisition.requestId;
      dispatch({ type: "started", invoiceId: id, requestId: paymentRequest });

      if (!isConnected || !address) {
        throw new Error("Connect the assigned payer wallet before paying.");
      }

      const payer = getAddress(address);
      if (getChainId(config) !== ARC_TESTNET.chainId) {
        await switchChain(config, { chainId: ARC_TESTNET.chainId });
      }

      const { INVOICE_REGISTRY_ADDRESS, invoiceRegistryAbi } = await import(
        "@/lib/contracts/invoiceRegistry"
      );
      const [code, registryUsdc] = await Promise.all([
        getBytecode(config, {
          address: INVOICE_REGISTRY_ADDRESS,
          chainId: ARC_TESTNET.chainId
        }),
        readContract(config, {
          address: INVOICE_REGISTRY_ADDRESS,
          abi: invoiceRegistryAbi,
          functionName: "usdc",
          chainId: ARC_TESTNET.chainId
        })
      ]);
      if (!code || code === "0x") {
        throw new Error("Invoice registry is not deployed on Arc Testnet.");
      }
      validateRegistryUsdc(registryUsdc);

      const submitted = (await readContract(config, {
        address: INVOICE_REGISTRY_ADDRESS,
        abi: invoiceRegistryAbi,
        functionName: "getInvoice",
        args: [id],
        chainId: ARC_TESTNET.chainId
      })) as ChainInvoice;
      if (normalizeInvoiceId(submitted.id) !== id) {
        throw new Error("Registry returned a different invoice ID.");
      }
      validatePaymentSnapshot(
        submitted,
        payer,
        BigInt(Math.floor(Date.now() / 1000))
      );

      const [balance, allowance] = await Promise.all([
        readContract(config, {
          address: USDC_ADDRESS,
          abi: usdcAbi,
          functionName: "balanceOf",
          args: [payer],
          chainId: ARC_TESTNET.chainId
        }),
        readContract(config, {
          address: USDC_ADDRESS,
          abi: usdcAbi,
          functionName: "allowance",
          args: [payer, INVOICE_REGISTRY_ADDRESS],
          chainId: ARC_TESTNET.chainId
        })
      ]);
      const plan = getPaymentPlan(balance, allowance, submitted.amount);
      if (!plan.canPay) {
        throw new Error(
          `Insufficient USDC balance. Required ${formatUsdc(submitted.amount)} USDC.`
        );
      }

      dispatch({
        type: "planned",
        requestId: paymentRequest,
        needsApproval: plan.needsApproval
      });

      if (plan.needsApproval) {
        if (invoiceKey.current !== id) {
          throw new Error("Invoice changed before approval broadcast.");
        }
        validatePaymentWrite(accountSnapshot(config), payer);
        const approvalTxHash = await writeContract(config, {
          address: USDC_ADDRESS,
          abi: usdcAbi,
          account: payer,
          chainId: ARC_TESTNET.chainId,
          functionName: "approve",
          args: [INVOICE_REGISTRY_ADDRESS, plan.approvalAmount]
        });
        dispatch({
          type: "approval_hash",
          requestId: paymentRequest,
          txHash: approvalTxHash
        });
        const approvalReceipt = await waitForTransactionReceipt(config, {
          chainId: ARC_TESTNET.chainId,
          hash: approvalTxHash
        });
        if (approvalReceipt.status !== "success") {
          throw new Error("USDC approval transaction reverted.");
        }

        const approved = await readContract(config, {
          address: USDC_ADDRESS,
          abi: usdcAbi,
          functionName: "allowance",
          args: [payer, INVOICE_REGISTRY_ADDRESS],
          chainId: ARC_TESTNET.chainId
        });
        if (approved < submitted.amount) {
          throw new Error("USDC allowance was not updated after approval.");
        }
        dispatch({ type: "approval_confirmed", requestId: paymentRequest });
      }

      const latest = (await readContract(config, {
        address: INVOICE_REGISTRY_ADDRESS,
        abi: invoiceRegistryAbi,
        functionName: "getInvoice",
        args: [id],
        chainId: ARC_TESTNET.chainId
      })) as ChainInvoice;
      validatePaymentSnapshot(latest, payer, BigInt(Math.floor(Date.now() / 1000)));
      if (
        normalizeInvoiceId(latest.id) !== normalizeInvoiceId(submitted.id) ||
        latest.amount !== submitted.amount ||
        !isAddressEqual(latest.merchant, submitted.merchant)
      ) {
        throw new Error("Invoice chain data changed before payment broadcast.");
      }
      if (invoiceKey.current !== id) {
        throw new Error("Invoice changed before payment broadcast.");
      }
      validatePaymentWrite(accountSnapshot(config), payer);

      const paymentTxHash = await writeContract(config, {
        address: INVOICE_REGISTRY_ADDRESS,
        abi: invoiceRegistryAbi,
        account: payer,
        chainId: ARC_TESTNET.chainId,
        functionName: "payInvoice",
        args: [submitted.id]
      });
      dispatch({
        type: "payment_hash",
        requestId: paymentRequest,
        txHash: paymentTxHash
      });

      const receipt = await waitForTransactionReceipt(config, {
        chainId: ARC_TESTNET.chainId,
        hash: paymentTxHash
      });
      validateInvoicePaid(receipt, INVOICE_REGISTRY_ADDRESS, {
        id: submitted.id,
        payer,
        merchant: submitted.merchant,
        amount: submitted.amount
      });

      const confirmed = (await readContract(config, {
        address: INVOICE_REGISTRY_ADDRESS,
        abi: invoiceRegistryAbi,
        functionName: "getInvoice",
        args: [id],
        chainId: ARC_TESTNET.chainId
      })) as ChainInvoice;
      validateConfirmedPayment(confirmed, submitted);
      const stale = invoiceKey.current !== id;
      if (!stale) {
        setInvoice(confirmed);
        setLoadedInvoiceId(id);
        setProof({
          invoiceId: id,
          status: "verified",
          txHash: paymentTxHash
        });
      }
      dispatch({ type: "payment_confirmed", requestId: paymentRequest });
      return { invoice: confirmed, txHash: paymentTxHash, stale };
    } catch (error) {
      dispatch({ type: "failed", requestId: paymentRequest, error: message(error) });
      return null;
    } finally {
      if (ownsRequest && activeRequest.current === paymentRequest) {
        activeRequest.current = undefined;
      }
    }
  }, [address, config, invoiceId, isConnected]);

  const currentId = (() => {
    try {
      return parseInvoiceId(invoiceId);
    } catch {
      return undefined;
    }
  })();
  const scopedInvoice =
    currentId && loadedInvoiceId
      ? selectInvoiceScope(currentId, { invoiceId: loadedInvoiceId, value: invoice })
      : undefined;
  const scopedMetadata =
    currentId && metadataInvoiceId
      ? selectInvoiceScope(currentId, {
          invoiceId: metadataInvoiceId,
          value: metadata
        })
      : undefined;
  const scopedError =
    currentId && loadErrorInvoiceId
      ? selectInvoiceScope(currentId, {
          invoiceId: loadErrorInvoiceId,
          value: loadError
        })
      : undefined;
  const scopedProof = currentId ? selectInvoiceScope(currentId, proof) : undefined;
  const scopedState = currentId ? selectInvoiceScope(currentId, state) : undefined;
  const loadingMatches =
    currentId &&
    loadingInvoiceId &&
    selectInvoiceScope(currentId, { invoiceId: loadingInvoiceId });

  return {
    pay,
    refresh: load,
    state: scopedState ?? { stage: "idle" as const, invoiceId: currentId },
    invoice: scopedInvoice?.value,
    metadata: scopedMetadata?.value,
    isLoading: loadingMatches ? isLoading : true,
    loadError: scopedError?.value,
    proof: scopedProof ?? {
      invoiceId: currentId,
      status: "idle" as const
    },
    paymentTxHash:
      scopedProof?.status === "verified" ? scopedProof.txHash : undefined,
    payerConnected: isConnected,
    connectedAddress: address
  };
}
