"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Wallet } from "lucide-react";
import { arcTestnet } from "@/lib/chains";
import { getWalletNetworkLabel } from "@/lib/walletDisplay";
import { WalletAccountPopover } from "./WalletAccountPopover";

type WalletConnectControlProps = {
  label?: string;
  size?: "sm" | "md";
  tone?: "dark" | "light";
};

export function WalletConnectControl({
  label = "Connect wallet",
  size = "md",
  tone = "dark"
}: WalletConnectControlProps) {
  const height = size === "sm" ? "h-10" : "h-12";
  const baseClass =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition active:translate-y-px";
  const toneClass =
    tone === "dark"
      ? "bg-ink text-white shadow-card hover:bg-slate-800"
      : "border border-slate-200 bg-white text-slate-700 hover:border-arc-100 hover:bg-arc-50";

  return (
    <ConnectButton.Custom>
      {({ account, chain, mounted, openChainModal, openConnectModal }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        const chainLabel = getWalletNetworkLabel(chain?.id, arcTestnet.id);

        if (!connected) {
          return (
            <button className={`${baseClass} ${height} ${toneClass}`} onClick={openConnectModal} type="button">
              <Wallet className="h-4 w-4" />
              {label}
            </button>
          );
        }

        if (chain.unsupported || chain.id !== arcTestnet.id) {
          return (
            <button className={`${baseClass} ${height} border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100`} onClick={openChainModal} type="button">
              <Wallet className="h-4 w-4" />
              {chainLabel}
            </button>
          );
        }

        return (
          <WalletAccountPopover
            address={account.address}
            buttonClassName={`${baseClass} ${height} ${toneClass}`}
            key={account.address}
          />
        );
      }}
    </ConnectButton.Custom>
  );
}
