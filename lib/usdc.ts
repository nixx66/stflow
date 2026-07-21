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

// Future live payment path:
// 1. Use ERC-20 USDC decimals (6) for invoice amounts.
// 2. parseUnits(invoice.amount, USDC_DECIMALS).
// 3. writeContract({ address: USDC_ADDRESS, abi: usdcAbi, functionName: "transfer", args: [merchantWallet, amount] }).
// 4. Wait for the receipt, then persist invoice status and tx hash.
