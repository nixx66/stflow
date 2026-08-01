"use client";

import { Wallet } from "lucide-react";
import { useState } from "react";
import { useConfig } from "wagmi";
import { switchChain } from "wagmi/actions";
import { getNetworkSwitchError, switchToArcTestnet } from "@/lib/walletNetwork";

type WalletNetworkSwitchProps = {
  buttonClassName: string;
  label: string;
};

export function WalletNetworkSwitch({
  buttonClassName,
  label
}: WalletNetworkSwitchProps) {
  const config = useConfig();
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string>();

  async function switchNetwork() {
    setError(undefined);
    setSwitching(true);

    try {
      await switchToArcTestnet((chainId) => switchChain(config, { chainId }));
    } catch (cause) {
      setError(getNetworkSwitchError(cause));
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="relative">
      <button
        className={`${buttonClassName} border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:cursor-wait disabled:opacity-70`}
        disabled={switching}
        onClick={switchNetwork}
        type="button"
      >
        <Wallet className="h-4 w-4" />
        {switching ? "Switching..." : label}
      </button>
      {error ? (
        <p
          aria-live="assertive"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-72 rounded-xl border border-red-200 bg-white px-3 py-2 text-left text-xs font-bold text-red-700 shadow-card"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
