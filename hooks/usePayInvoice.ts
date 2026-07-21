"use client";

import { useCallback, useState } from "react";
import { isAddress, parseUnits, type Address, type Hash } from "viem";
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWriteContract
} from "wagmi";
import { arcTestnet } from "@/lib/chains";
import { createMockTxHash, markInvoicePaid } from "@/lib/invoice";
import { syncInvoiceToServer } from "@/lib/invoiceServerClient";
import { getPayerAuthorization, getPaymentEligibility } from "@/lib/invoiceStatus";
import { getPaymentMode, isLivePaymentMode } from "@/lib/paymentMode";
import { USDC_ADDRESS, USDC_DECIMALS, usdcAbi } from "@/lib/usdc";
import { Invoice } from "@/types/invoice";

const MOCK_PAYER_WALLET = "0x742d35Cc6634C0532925a3b844Bc454e4438f44e";

export type PaymentStage =
  | "idle"
  | "wallet"
  | "submitted"
  | "confirming"
  | "success"
  | "error";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function usePayInvoice(invoice: Invoice) {
  const paymentMode = getPaymentMode();
  const livePayment = isLivePaymentMode(paymentMode);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: arcTestnet.id });
  const [stage, setStage] = useState<PaymentStage>("idle");
  const [txHash, setTxHash] = useState<string>();
  const [error, setError] = useState<string>();

  const payMockInvoice = useCallback(async () => {
    try {
      setError(undefined);

      if (!getPaymentEligibility(invoice).canPay) {
        throw new Error("Payment link has expired.");
      }

      setStage("wallet");
      await delay(900);
      setStage("submitted");
      const mockTxHash = createMockTxHash();
      setTxHash(mockTxHash);
      await delay(900);
      setStage("confirming");
      await delay(1000);
      const paidInvoice = markInvoicePaid(invoice.id, invoice.customerWallet ?? MOCK_PAYER_WALLET, mockTxHash);
      if (!paidInvoice) {
        throw new Error("Invoice is not payable");
      }
      void syncInvoiceToServer(paidInvoice);
      setStage("success");
      return paidInvoice;
    } catch {
      setStage("error");
      setError("Payment failed because the payment link is expired or no longer payable.");
      return null;
    }
  }, [invoice]);

  const payLiveInvoice = useCallback(async () => {
    try {
      setError(undefined);

      if (!getPaymentEligibility(invoice).canPay) {
        throw new Error("Payment link has expired.");
      }

      if (paymentMode === "memo-transfer") {
        throw new Error("Memo transfer is reserved for the next integration step.");
      }

      if (!isConnected || !address) {
        throw new Error("Connect a payer wallet before sending real USDC.");
      }

      const payerAuthorization = getPayerAuthorization(invoice, address);

      if (!payerAuthorization.canPay) {
        if (payerAuthorization.reason === "merchant_wallet") {
          throw new Error("Merchant wallet cannot pay its own invoice.");
        }

        if (payerAuthorization.reason === "wrong_payer_wallet") {
          throw new Error("Switch to the payer wallet assigned to this invoice.");
        }

        throw new Error("Connect the payer wallet assigned to this invoice.");
      }

      if (!isAddress(invoice.merchantWallet)) {
        throw new Error("Merchant wallet is not a valid EVM address.");
      }

      if (!publicClient) {
        throw new Error("Public client is not ready.");
      }

      setStage("wallet");
      if (chainId !== arcTestnet.id) {
        await switchChainAsync({ chainId: arcTestnet.id });
      }

      const amount = parseUnits(invoice.amount, USDC_DECIMALS);
      const hash = await writeContractAsync({
        address: USDC_ADDRESS,
        abi: usdcAbi,
        functionName: "transfer",
        args: [invoice.merchantWallet as Address, amount],
        chainId: arcTestnet.id
      });

      setTxHash(hash);
      setStage("submitted");
      setStage("confirming");
      await publicClient.waitForTransactionReceipt({ hash: hash as Hash });

      const paidInvoice = markInvoicePaid(invoice.id, address, hash);
      if (!paidInvoice) {
        throw new Error("Invoice is not payable");
      }

      void syncInvoiceToServer(paidInvoice);
      setStage("success");
      return paidInvoice;
    } catch (caughtError) {
      setStage("error");
      setError(caughtError instanceof Error ? caughtError.message : "Payment failed.");
      return null;
    }
  }, [
    address,
    chainId,
    invoice.amount,
    invoice.expiresAt,
    invoice.id,
    invoice.merchantWallet,
    invoice.customerWallet,
    invoice.status,
    isConnected,
    paymentMode,
    publicClient,
    switchChainAsync,
    writeContractAsync
  ]);

  const pay = useCallback(() => {
    return livePayment ? payLiveInvoice() : payMockInvoice();
  }, [livePayment, payLiveInvoice, payMockInvoice]);

  return {
    pay,
    stage,
    txHash,
    error,
    paymentMode,
    livePayment,
    payerConnected: isConnected,
    payerChainId: chainId,
    isPaying: !["idle", "success", "error"].includes(stage)
  };
}
