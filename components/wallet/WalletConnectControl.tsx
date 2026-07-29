"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Check, ChevronDown, Copy, LogOut, Wallet } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useDisconnect } from "wagmi";
import { arcTestnet } from "@/lib/chains";
import {
  copyWalletAddress,
  getWalletNetworkLabel,
  shortenWalletAddress
} from "@/lib/walletDisplay";

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
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { disconnect } = useDisconnect();
  const height = size === "sm" ? "h-10" : "h-12";
  const baseClass =
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 text-sm font-bold transition active:translate-y-px";
  const toneClass =
    tone === "dark"
      ? "bg-ink text-white shadow-card hover:bg-slate-800"
      : "border border-slate-200 bg-white text-slate-700 hover:border-arc-100 hover:bg-arc-50";

  useEffect(() => {
    if (!open) return;

    const closeOutside = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const copyAddress = async (address: string) => {
    if (!navigator.clipboard?.writeText) return;

    const success = await copyWalletAddress(
      address,
      navigator.clipboard.writeText.bind(navigator.clipboard)
    );
    if (!success) return;

    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 1800);
  };

  const disconnectWallet = () => {
    disconnect();
    setOpen(false);
  };

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
          <div className="relative inline-flex" ref={menuRef}>
            <button
              aria-expanded={open}
              aria-haspopup="menu"
              className={`${baseClass} ${height} ${toneClass}`}
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              <Wallet className="h-4 w-4" />
              {shortenWalletAddress(account.address)}
              <ChevronDown
                aria-hidden="true"
                className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>

            {open ? (
              <div
                aria-label="Wallet account"
                className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-72 rounded-2xl border border-[#dbe9d7] bg-white p-2 text-left text-[#07111f] shadow-[0_18px_50px_rgba(4,41,31,0.16)]"
                role="menu"
              >
                <div className="px-3 pb-2 pt-1">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#667085]">
                    Connected wallet
                  </p>
                  <p className="mt-1 break-all font-mono text-xs leading-5 text-[#063f2c]">
                    {account.address}
                  </p>
                </div>
                <div className="border-t border-[#e6eee3] pt-1">
                  <button
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-[#344054] transition hover:bg-[#f1f8ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82d8a1]"
                    onClick={() => void copyAddress(account.address)}
                    role="menuitem"
                    type="button"
                  >
                    {copied ? (
                      <Check aria-hidden="true" className="h-4 w-4 text-[#079455]" />
                    ) : (
                      <Copy aria-hidden="true" className="h-4 w-4" />
                    )}
                    {copied ? "Address copied" : "Copy address"}
                  </button>
                  <button
                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-[#b42318] transition hover:bg-[#fff4f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fda29b]"
                    onClick={disconnectWallet}
                    role="menuitem"
                    type="button"
                  >
                    <LogOut aria-hidden="true" className="h-4 w-4" />
                    Disconnect wallet
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
