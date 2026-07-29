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
  formatUnits,
  getAddress,
  http,
  isAddressEqual,
  isHex,
  type Address,
  type Hex
} from "viem";
import { useAccount, useConfig } from "wagmi";
import { ARC_TESTNET } from "@/lib/arc";
import { arcTestnet } from "@/lib/chains";
import { hashInvoiceMetadata, type InvoiceMetadata } from "@/lib/invoiceMetadata";
import {
  beginPayment,
  getPaymentPlan,
  invoicePaidEvent,
  reducePaymentState,
  validateConfirmedPayment,
  validateInvoicePaid,
  validatePaymentSnapshot,
  validatePaymentWrite,
  type ChainInvoice,
  type PaymentState
} from "@/lib/paymentTransaction";
import { USDC_ADDRESS, USDC_DECIMALS, usdcAbi } from "@/lib/usdc";

const initialState: PaymentState = { stage: "idle" };
const arcClient = createPublicClient({ chain: arcTestnet, transport: http() });

function message(error: unknown) {
  return error instanceof Error ? error.message : "Unable to pay this invoice.";
}

function requestId(): Hex {
  return bytesToHex(crypto.getRandomValues(new Uint8Array(32)));
}

function parseInvoiceId(value: string): Hex {
  if (!isHex(value) || value.length !== 66) {
    throw new Error("Invoice ID must be a bytes32 value.");
  }
  return value;
}

function accountSnapshot(config: Parameters<typeof getAccount>[0]) {
  const account = getAccount(config);
  return { address: account.address, chainId: getChainId(config) };
}

type Metadata = InvoiceMetadata;

async function getVerifiedMetadata(id: Hex, expectedHash: Hex) {
  const response = await fetch(`/api/v1/invoices/${id}`, { cache: "no-store" });
  if (!response.ok) return undefined;

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
  const [knownPaymentHash, setKnownPaymentHash] = useState<Hex>();
  const activeRequest = useRef<Hex | undefined>(undefined);

  const load = useCallback(async () => {
    setIsLoading(true);
    setLoadError(undefined);

    try {
      const id = parseInvoiceId(invoiceId);
      const { INVOICE_REGISTRY_ADDRESS, invoiceRegistryAbi } = await import(
        "@/lib/contracts/invoiceRegistry"
      );
      const current = (await readContract(config, {
        address: INVOICE_REGISTRY_ADDRESS,
        abi: invoiceRegistryAbi,
        functionName: "getInvoice",
        args: [id],
        chainId: ARC_TESTNET.chainId
      })) as ChainInvoice;

      setInvoice(current);
      try {
        setMetadata(await getVerifiedMetadata(id, current.metadataHash));
      } catch (error) {
        setMetadata(undefined);
        setLoadError(message(error));
      }

      if (current.status === 1) {
        try {
          if (receiptHash) {
            const receipt = await arcClient.getTransactionReceipt({ hash: receiptHash });
            validateInvoicePaid(receipt, INVOICE_REGISTRY_ADDRESS, {
              id,
              payer: current.payer,
              merchant: current.merchant,
              amount: current.amount
            });
            setKnownPaymentHash(receiptHash);
            return;
          }

          const logs = await arcClient.getLogs({
            address: INVOICE_REGISTRY_ADDRESS,
            event: invoicePaidEvent,
            args: { id },
            fromBlock: "earliest",
            toBlock: "latest"
          });
          setKnownPaymentHash(
            logs.length === 1 ? logs[0].transactionHash : undefined
          );
        } catch {
          setKnownPaymentHash(undefined);
        }
      }
    } catch (error) {
      setInvoice(undefined);
      setMetadata(undefined);
      setLoadError(message(error));
    } finally {
      setIsLoading(false);
    }
  }, [config, invoiceId, receiptHash]);

  useEffect(() => {
    void load();
  }, [load]);

  const pay = useCallback(async () => {
    const paymentRequest = requestId();
    activeRequest.current = beginPayment(activeRequest.current, paymentRequest);
    dispatch({ type: "started", requestId: paymentRequest });

    try {
      if (!isConnected || !address) {
        throw new Error("Connect the assigned payer wallet before paying.");
      }

      const payer = getAddress(address);
      if (getChainId(config) !== ARC_TESTNET.chainId) {
        await switchChain(config, { chainId: ARC_TESTNET.chainId });
      }

      const id = parseInvoiceId(invoiceId);
      const { INVOICE_REGISTRY_ADDRESS, invoiceRegistryAbi } = await import(
        "@/lib/contracts/invoiceRegistry"
      );
      const code = await getBytecode(config, {
        address: INVOICE_REGISTRY_ADDRESS,
        chainId: ARC_TESTNET.chainId
      });
      if (!code || code === "0x") {
        throw new Error("Invoice registry is not deployed on Arc Testnet.");
      }

      const submitted = (await readContract(config, {
        address: INVOICE_REGISTRY_ADDRESS,
        abi: invoiceRegistryAbi,
        functionName: "getInvoice",
        args: [id],
        chainId: ARC_TESTNET.chainId
      })) as ChainInvoice;
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
          `Insufficient USDC balance. Required ${formatUnits(submitted.amount, USDC_DECIMALS)} USDC.`
        );
      }

      dispatch({
        type: "planned",
        requestId: paymentRequest,
        needsApproval: plan.needsApproval
      });

      if (plan.needsApproval) {
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

      validatePaymentWrite(accountSnapshot(config), payer);
      const latest = (await readContract(config, {
        address: INVOICE_REGISTRY_ADDRESS,
        abi: invoiceRegistryAbi,
        functionName: "getInvoice",
        args: [id],
        chainId: ARC_TESTNET.chainId
      })) as ChainInvoice;
      validatePaymentSnapshot(latest, payer, BigInt(Math.floor(Date.now() / 1000)));
      if (
        latest.id !== submitted.id ||
        latest.amount !== submitted.amount ||
        !isAddressEqual(latest.merchant, submitted.merchant)
      ) {
        throw new Error("Invoice chain data changed before payment broadcast.");
      }

      const paymentTxHash = await writeContract(config, {
        address: INVOICE_REGISTRY_ADDRESS,
        abi: invoiceRegistryAbi,
        account: payer,
        chainId: ARC_TESTNET.chainId,
        functionName: "payInvoice",
        args: [id]
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
        id,
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
      setInvoice(confirmed);
      setKnownPaymentHash(paymentTxHash);
      dispatch({ type: "payment_confirmed", requestId: paymentRequest });
      return { invoice: confirmed, txHash: paymentTxHash };
    } catch (error) {
      dispatch({ type: "failed", requestId: paymentRequest, error: message(error) });
      return null;
    } finally {
      if (activeRequest.current === paymentRequest) {
        activeRequest.current = undefined;
      }
    }
  }, [address, config, invoiceId, isConnected]);

  return {
    pay,
    refresh: load,
    state,
    invoice,
    metadata,
    isLoading,
    loadError,
    paymentTxHash: state.paymentTxHash ?? knownPaymentHash,
    payerConnected: isConnected,
    connectedAddress: address
  };
}
