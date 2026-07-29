import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./chains";

export const wagmiConfig = getDefaultConfig({
  appName: "STFlow",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "walletconnect-not-configured",
  chains: [arcTestnet],
  ssr: true
});
