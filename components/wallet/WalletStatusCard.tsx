"use client";

import { CheckCircle2, CircleAlert, Wallet } from "lucide-react";
import { useAccount, useChainId } from "wagmi";
import { arcTestnet } from "@/lib/chains";
import { getWalletConnectionLabel, getWalletNetworkLabel } from "@/lib/walletDisplay";
import { WalletConnectControl } from "./WalletConnectControl";

type WalletStatusCardProps = {
  audience: "merchant" | "payer";
};

export function WalletStatusCard({ audience }: WalletStatusCardProps) {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const networkReady = chainId === arcTestnet.id;
  const title = audience === "merchant" ? "Merchant wallet" : "Payer wallet";
  const description =
    audience === "merchant"
      ? "Creates invoices and receives contract-authorized Arc Testnet USDC settlement."
      : "Must match the assigned payer before approving and settling Arc Testnet USDC.";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-black text-arc-600">
            <Wallet className="h-4 w-4" />
            {title}
          </div>
          <p className="mt-2 text-sm font-semibold leading-6 text-muted">{description}</p>
        </div>
        <WalletConnectControl size="sm" tone="light" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Wallet</p>
          <p className="mt-2 font-mono text-sm font-black text-ink">
            {getWalletConnectionLabel(address)}
          </p>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Network</p>
          <div className="mt-2 flex items-center gap-2">
            {isConnected && networkReady ? (
              <CheckCircle2 className="h-4 w-4 text-arc-600" />
            ) : (
              <CircleAlert className="h-4 w-4 text-amber-600" />
            )}
            <p className="text-sm font-black text-ink">{getWalletNetworkLabel(chainId, arcTestnet.id)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
