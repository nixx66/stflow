import { defineChain } from "viem";
import { ARC_TESTNET } from "./arc";

export const arcTestnet = defineChain({
  id: ARC_TESTNET.chainId,
  name: "Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "USDC",
    symbol: "USDC"
  },
  rpcUrls: {
    default: {
      http: [ARC_TESTNET.rpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: ARC_TESTNET.explorerUrl
    }
  },
  testnet: true
});

export const arcExplorerUrl =
  ARC_TESTNET.explorerUrl;
