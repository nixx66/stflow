import { defineChain } from "viem";
import { ARC_TESTNET } from "./arc";

const fallbackChainId = ARC_TESTNET.chainId;
const fallbackRpcUrl = ARC_TESTNET.rpcUrl;
const fallbackExplorerUrl = ARC_TESTNET.explorerUrl;

export const arcTestnet = defineChain({
  id: Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || fallbackChainId),
  name: "Testnet",
  nativeCurrency: {
    decimals: 18,
    name: "USDC",
    symbol: "USDC"
  },
  rpcUrls: {
    default: {
      http: [process.env.NEXT_PUBLIC_ARC_RPC_URL || fallbackRpcUrl]
    }
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || fallbackExplorerUrl
    }
  },
  testnet: true
});

export const arcExplorerUrl =
  process.env.NEXT_PUBLIC_ARC_EXPLORER_URL || fallbackExplorerUrl;
