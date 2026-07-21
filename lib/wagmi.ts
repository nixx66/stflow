import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { arcTestnet } from "./chains";

export const wagmiConfig = getDefaultConfig({
  appName: "STFlow",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "stflow-local-mock",
  chains: [arcTestnet],
  ssr: true
});
