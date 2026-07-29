import { getAddress, isAddress, type Address } from "viem";

function registryAddress(): Address {
  const value = process.env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS;

  if (!value || !isAddress(value, { strict: true })) {
    throw new Error(
      "NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS must be a checksummed or lowercase address"
    );
  }

  return getAddress(value);
}

export const INVOICE_REGISTRY_ADDRESS = registryAddress();

const invoiceComponents = [
  { name: "id", type: "bytes32" },
  { name: "merchant", type: "address" },
  { name: "payer", type: "address" },
  { name: "amount", type: "uint128" },
  { name: "createdAt", type: "uint64" },
  { name: "dueAt", type: "uint64" },
  { name: "paidAt", type: "uint64" },
  { name: "metadataHash", type: "bytes32" },
  { name: "status", type: "uint8" }
] as const;

export const invoiceRegistryAbi = [
  {
    type: "function",
    name: "usdc",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }]
  },
  {
    type: "function",
    name: "createInvoice",
    stateMutability: "nonpayable",
    inputs: [
      { name: "referenceId", type: "bytes32" },
      { name: "payer", type: "address" },
      { name: "amount", type: "uint128" },
      { name: "dueAt", type: "uint64" },
      { name: "metadataHash", type: "bytes32" }
    ],
    outputs: [{ name: "id", type: "bytes32" }]
  },
  {
    type: "function",
    name: "invoiceId",
    stateMutability: "pure",
    inputs: [
      { name: "merchant", type: "address" },
      { name: "referenceId", type: "bytes32" }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "invoiceCount",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "getInvoiceIds",
    stateMutability: "view",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "offset", type: "uint256" },
      { name: "limit", type: "uint256" }
    ],
    outputs: [{ name: "ids", type: "bytes32[]" }]
  },
  {
    type: "function",
    name: "getInvoice",
    stateMutability: "view",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: [
      {
        name: "invoice",
        type: "tuple",
        components: invoiceComponents
      }
    ]
  },
  {
    type: "function",
    name: "payInvoice",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: []
  },
  {
    type: "function",
    name: "cancelInvoice",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "bytes32" }],
    outputs: []
  },
  {
    type: "event",
    name: "InvoiceCreated",
    anonymous: false,
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "merchant", type: "address", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "amount", type: "uint128", indexed: false },
      { name: "dueAt", type: "uint64", indexed: false },
      { name: "metadataHash", type: "bytes32", indexed: false }
    ]
  },
  {
    type: "event",
    name: "InvoicePaid",
    anonymous: false,
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "merchant", type: "address", indexed: true },
      { name: "amount", type: "uint128", indexed: false }
    ]
  },
  {
    type: "event",
    name: "InvoiceCancelled",
    anonymous: false,
    inputs: [
      { name: "id", type: "bytes32", indexed: true },
      { name: "merchant", type: "address", indexed: true }
    ]
  },
  { type: "error", name: "InvoiceAlreadyExists", inputs: [] },
  { type: "error", name: "InvoiceNotFound", inputs: [] },
  { type: "error", name: "InvalidUsdc", inputs: [] },
  { type: "error", name: "InvalidPayer", inputs: [] },
  { type: "error", name: "InvalidAmount", inputs: [] },
  { type: "error", name: "InvalidDeadline", inputs: [] },
  { type: "error", name: "UnauthorizedPayer", inputs: [] },
  { type: "error", name: "UnauthorizedMerchant", inputs: [] },
  { type: "error", name: "InvoiceNotPending", inputs: [] },
  { type: "error", name: "InvoiceExpired", inputs: [] },
  { type: "error", name: "ReentrancyGuardReentrantCall", inputs: [] },
  {
    type: "error",
    name: "SafeERC20FailedOperation",
    inputs: [{ name: "token", type: "address" }]
  }
] as const;
