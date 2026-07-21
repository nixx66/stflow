import type { Invoice } from "../types/invoice.ts";
import { ARC_TESTNET } from "./arc.ts";

export const MOCK_MERCHANT_A = "0xA12F8E7D5C4B3A2918076F5E4D3C2B1A09876543";
export const MOCK_MERCHANT_B = "0xB98E7D6C5B4A39281706F5E4D3C2B1A098765432";
const mockChainId = Number(process.env.NEXT_PUBLIC_ARC_CHAIN_ID || ARC_TESTNET.chainId);

export const mockInvoices: Invoice[] = [
  {
    id: "af-1001",
    merchantWallet: MOCK_MERCHANT_A,
    payerWallet: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
    title: "Design sprint deposit",
    description: "Initial payment for STFlow checkout UI sprint.",
    memo: "Q3 product sprint deposit",
    amount: "1250",
    currency: "USDC",
    status: "paid",
    paymentTxHash:
      "0x91f0afbd25fb0c713d2b46d7ae2acfed1917e7e194f5bf33a83e2df2f2c01990",
    chainId: mockChainId,
    createdAt: "2026-06-18T09:24:00.000Z",
    paidAt: "2026-06-18T09:31:00.000Z",
    expiresAt: "2026-06-25T09:24:00.000Z"
  },
  {
    id: "af-1002",
    merchantWallet: MOCK_MERCHANT_A,
    payerWallet: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
    title: "API integration retainer",
    description: "Monthly stablecoin checkout retainer.",
    memo: "Retainer July",
    amount: "3200",
    currency: "USDC",
    status: "paid",
    paymentTxHash:
      "0x62c8d8fa1d678d82ec41be712afe9d6a735f808f2c9cf708ed4ddf29273eea65",
    chainId: mockChainId,
    createdAt: "2026-06-22T13:05:00.000Z",
    paidAt: "2026-06-22T13:18:00.000Z"
  },
  {
    id: "af-1003",
    merchantWallet: MOCK_MERCHANT_A,
    title: "Checkout implementation",
    description: "USDC checkout page and receipt workflow.",
    memo: "Awaiting customer approval",
    amount: "890",
    currency: "USDC",
    status: "pending",
    chainId: mockChainId,
    createdAt: "2026-06-29T11:40:00.000Z",
    expiresAt: "2026-07-09T11:40:00.000Z"
  },
  {
    id: "af-2001",
    merchantWallet: MOCK_MERCHANT_B,
    title: "Marketplace onboarding",
    description: "Pilot invoice for merchant B.",
    memo: "Merchant B pending checkout",
    amount: "540",
    currency: "USDC",
    status: "pending",
    chainId: mockChainId,
    createdAt: "2026-06-27T16:10:00.000Z",
    expiresAt: "2026-07-05T16:10:00.000Z"
  },
  {
    id: "af-2002",
    merchantWallet: MOCK_MERCHANT_B,
    title: "Expired quote",
    description: "An older invoice that was not paid in time.",
    memo: "Renew before payment",
    amount: "175",
    currency: "USDC",
    status: "expired",
    chainId: mockChainId,
    createdAt: "2026-05-12T08:20:00.000Z",
    expiresAt: "2026-05-19T08:20:00.000Z"
  }
];
