import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { arcTestnet } from "./chains.ts";

export function hasWalletConnectProject(projectId: string | undefined) {
  return Boolean(projectId && /^[0-9a-f]{32}$/i.test(projectId.trim()));
}

export function createWagmiConfig(projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID) {
  const walletConnectEnabled = hasWalletConnectProject(projectId);

  return getDefaultConfig({
    appName: "STFlow",
    projectId: walletConnectEnabled ? projectId! : "disabled",
    ...(walletConnectEnabled
      ? {}
      : {
          wallets: [
            {
              groupName: "Browser wallets",
              wallets: [injectedWallet]
            }
          ]
        }),
    chains: [arcTestnet],
    ssr: true
  });
}

export const wagmiConfig = createWagmiConfig();
