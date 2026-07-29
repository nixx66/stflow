export function shortenWalletAddress(address?: string | null) {
  if (!address) return "";
  if (address.length <= 12) return address;

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getWalletConnectionLabel(address?: string | null) {
  return address ? shortenWalletAddress(address) : "Wallet not connected";
}

export function getWalletNetworkLabel(chainId: number | undefined, targetChainId: number) {
  if (!chainId) return "Network not connected";
  return chainId === targetChainId ? "Testnet ready" : "Switch to Testnet";
}

export async function copyWalletAddress(
  address: string,
  writeText: (value: string) => Promise<void>
) {
  try {
    await writeText(address);
    return true;
  } catch {
    return false;
  }
}

export function getMerchantWalletDisplay({
  connectedWallet,
  livePayment
}: {
  connectedWallet?: string | null;
  livePayment: boolean;
}) {
  if (livePayment && !connectedWallet) {
    return {
      badge: "Connect wallet required",
      detail: "No merchant wallet connected",
      isConnected: false
    };
  }

  if (connectedWallet) {
    return {
      badge: "Connected wallet",
      detail: shortenWalletAddress(connectedWallet),
      isConnected: true
    };
  }

  return {
    badge: "Demo wallet",
    detail: "Demo merchant wallet",
    isConnected: false
  };
}
