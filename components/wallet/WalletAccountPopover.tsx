"use client";

import { Check, ChevronDown, Copy, LogOut, Wallet } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useDisconnect } from "wagmi";
import { copyWalletAddress, shortenWalletAddress } from "@/lib/walletDisplay";
import { listenForPopoverDismiss } from "@/lib/walletPopover";

type WalletAccountPopoverProps = {
  address: string;
  buttonClassName: string;
};

export function WalletAccountPopover({
  address,
  buttonClassName
}: WalletAccountPopoverProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const actionsId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { disconnect } = useDisconnect();

  const clearCopyState = () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = undefined;
    setCopied(false);
  };

  const close = (restoreFocus = false) => {
    setOpen(false);
    clearCopyState();
    if (restoreFocus) queueMicrotask(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;

    copyButtonRef.current?.focus();
    return listenForPopoverDismiss(
      document,
      (target) => target instanceof Node && Boolean(containerRef.current?.contains(target)),
      (reason) => close(reason === "escape")
    );
  }, [open]);

  useEffect(
    () => () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    },
    []
  );

  const copyAddress = async () => {
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
    close();
  };

  return (
    <div className="relative inline-flex" ref={containerRef}>
      <button
        aria-controls={open ? actionsId : undefined}
        aria-expanded={open}
        className={buttonClassName}
        onClick={() => (open ? close() : setOpen(true))}
        ref={triggerRef}
        type="button"
      >
        <Wallet className="h-4 w-4" />
        {shortenWalletAddress(address)}
        <ChevronDown
          aria-hidden="true"
          className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          aria-label="Wallet account actions"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-[70] w-72 rounded-2xl border border-[#dbe9d7] bg-white p-2 text-left text-[#07111f] shadow-[0_18px_50px_rgba(4,41,31,0.16)]"
          id={actionsId}
          role="group"
        >
          <div className="px-3 pb-2 pt-1">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#667085]">
              Connected wallet
            </p>
            <p className="mt-1 break-all font-mono text-xs leading-5 text-[#063f2c]">
              {address}
            </p>
          </div>
          <div className="border-t border-[#e6eee3] pt-1">
            <button
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-[#344054] transition hover:bg-[#f1f8ef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82d8a1]"
              onClick={() => void copyAddress()}
              ref={copyButtonRef}
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
}
