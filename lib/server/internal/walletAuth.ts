import { createHash } from "node:crypto";
import {
  getAddress,
  isAddress,
  isAddressEqual,
  isHex,
  verifyMessage,
  type Address,
  type Hex
} from "viem";

export type WalletAction = "create_invoice" | "list_invoices";

type ChallengeFields = {
  wallet: Address;
  action: WalletAction;
  registry: Address;
  payloadBinding: Hex;
  nonce: string;
  issuedAt: Date;
  expiresAt: Date;
};

export class WalletAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WalletAuthError";
  }
}

export function hashNonce(nonce: string) {
  return createHash("sha256").update(nonce, "utf8").digest("hex");
}

export function buildWalletChallenge(fields: ChallengeFields) {
  const wallet = getAddress(fields.wallet).toLowerCase();
  const registry = getAddress(fields.registry).toLowerCase();

  return [
    "STFlow Invoice Authorization",
    "Version: 1",
    `Wallet: ${wallet}`,
    `Action: ${fields.action}`,
    "Chain ID: 5042002",
    `Registry: ${registry}`,
    `Payload: ${fields.payloadBinding.toLowerCase()}`,
    `Nonce: ${fields.nonce}`,
    `Issued At: ${fields.issuedAt.toISOString()}`,
    `Expires At: ${fields.expiresAt.toISOString()}`
  ].join("\n");
}

function parseChallenge(message: string): ChallengeFields {
  if (message.length > 2048) throw new WalletAuthError("Invalid challenge.");
  const lines = message.split("\n");
  if (
    lines.length !== 10 ||
    lines[0] !== "STFlow Invoice Authorization" ||
    lines[1] !== "Version: 1" ||
    lines[4] !== "Chain ID: 5042002"
  ) {
    throw new WalletAuthError("Invalid challenge.");
  }

  const wallet = lines[2].slice("Wallet: ".length);
  const action = lines[3].slice("Action: ".length) as WalletAction;
  const registry = lines[5].slice("Registry: ".length);
  const payloadBinding = lines[6].slice("Payload: ".length);
  const nonce = lines[7].slice("Nonce: ".length);
  const issuedAt = new Date(lines[8].slice("Issued At: ".length));
  const expiresAt = new Date(lines[9].slice("Expires At: ".length));

  if (
    !lines[2].startsWith("Wallet: ") ||
    !lines[3].startsWith("Action: ") ||
    !lines[5].startsWith("Registry: ") ||
    !lines[6].startsWith("Payload: ") ||
    !lines[7].startsWith("Nonce: ") ||
    !lines[8].startsWith("Issued At: ") ||
    !lines[9].startsWith("Expires At: ") ||
    !isAddress(wallet, { strict: false }) ||
    !isAddress(registry, { strict: false }) ||
    !isHex(payloadBinding, { strict: true }) ||
    payloadBinding.length !== 66 ||
    !/^[0-9a-f]{32,128}$/i.test(nonce) ||
    !["create_invoice", "list_invoices"].includes(action) ||
    !Number.isFinite(issuedAt.getTime()) ||
    !Number.isFinite(expiresAt.getTime())
  ) {
    throw new WalletAuthError("Invalid challenge.");
  }

  return {
    wallet: getAddress(wallet),
    action,
    registry: getAddress(registry),
    payloadBinding: payloadBinding as Hex,
    nonce,
    issuedAt,
    expiresAt
  };
}

export async function verifyWalletAuthorization(input: {
  message: string;
  signature: Hex;
  expectedWallet: Address;
  expectedAction: WalletAction;
  expectedRegistry: Address;
  expectedPayloadBinding: Hex;
  now?: Date;
}) {
  const parsed = parseChallenge(input.message);
  const now = input.now ?? new Date();
  const lifetime = parsed.expiresAt.getTime() - parsed.issuedAt.getTime();

  if (
    parsed.action !== input.expectedAction ||
    !isAddressEqual(parsed.wallet, input.expectedWallet) ||
    !isAddressEqual(parsed.registry, input.expectedRegistry) ||
    parsed.payloadBinding.toLowerCase() !== input.expectedPayloadBinding.toLowerCase()
  ) {
    throw new WalletAuthError("Challenge does not match this request.");
  }
  if (lifetime <= 0 || lifetime > 10 * 60_000) {
    throw new WalletAuthError("Invalid challenge lifetime.");
  }
  if (now < parsed.issuedAt || now >= parsed.expiresAt) {
    throw new WalletAuthError("Challenge expired.");
  }

  const valid = await verifyMessage({
    address: parsed.wallet,
    message: input.message,
    signature: input.signature
  });
  if (!valid) throw new WalletAuthError("Invalid wallet signature.");

  return {
    ...parsed,
    wallet: parsed.wallet.toLowerCase() as Address,
    registry: parsed.registry.toLowerCase() as Address,
    nonceHash: hashNonce(parsed.nonce)
  };
}

export async function verifyChallengeAuthorization(input: {
  message: string;
  signature: Hex;
  expectedAction: WalletAction;
  expectedRegistry: Address;
  expectedPayloadBinding: Hex;
  now?: Date;
}) {
  const parsed = parseChallenge(input.message);
  return verifyWalletAuthorization({
    ...input,
    expectedWallet: parsed.wallet
  });
}
