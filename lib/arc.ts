import type { Address } from "viem";

export const ARC_TESTNET = {
  chainId: 5042002,
  name: "Testnet",
  rpcUrl: "https://rpc.testnet.arc.network",
  websocketUrl: "wss://rpc.testnet.arc.network",
  explorerUrl: "https://testnet.arcscan.app",
  nativeCurrency: {
    name: "USDC",
    symbol: "USDC",
    decimals: 18
  }
} as const;

export const ARC_CONTRACTS = {
  usdc: "0x3600000000000000000000000000000000000000" as Address,
  memo: "0x5294E9927c3306DcBaDb03fe70b92e01cCede505" as Address,
  multicall3: "0xcA11bde05977b3631167028862bE2a173976CA11" as Address,
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address
} as const;

export const ARC_USDC_ERC20_DECIMALS = 6;

export const arcMemoAbi = [
  {
    type: "function",
    name: "memo",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "memoId", type: "bytes32" },
      { name: "memoData", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "event",
    name: "BeforeMemo",
    anonymous: false,
    inputs: [{ name: "memoIndex", type: "uint256", indexed: true }]
  },
  {
    type: "event",
    name: "Memo",
    anonymous: false,
    inputs: [
      { name: "sender", type: "address", indexed: true },
      { name: "target", type: "address", indexed: true },
      { name: "callDataHash", type: "bytes32", indexed: false },
      { name: "memoId", type: "bytes32", indexed: true },
      { name: "memo", type: "bytes", indexed: false },
      { name: "memoIndex", type: "uint256", indexed: false }
    ]
  }
] as const;

export function getArcExplorerTxUrl(txHash: string) {
  return `${ARC_TESTNET.explorerUrl}/tx/${txHash}`;
}
