import type { Address } from "viem";
import { ARC_CONTRACTS, ARC_USDC_ERC20_DECIMALS } from "./arc";

export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  ARC_CONTRACTS.usdc) as Address;

export const USDC_DECIMALS = ARC_USDC_ERC20_DECIMALS;

export const usdcAbi = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }]
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }]
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  }
] as const;
