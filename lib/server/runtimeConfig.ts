import { isIP } from "node:net";
import { getAddress, type Address } from "viem";
import { ARC_CONTRACTS, ARC_TESTNET } from "../arc.ts";

const requiredVariables = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS"
] as const;

type RequiredVariable = (typeof requiredVariables)[number];
type Environment = Record<string, string | undefined>;

export type ServerRuntimeConfig = Readonly<{
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  invoiceRegistryAddress: Address;
  chainId: typeof ARC_TESTNET.chainId;
  rpcUrl: typeof ARC_TESTNET.rpcUrl;
  explorerUrl: typeof ARC_TESTNET.explorerUrl;
  usdcAddress: typeof ARC_CONTRACTS.usdc;
}>;

export class RuntimeConfigError extends Error {
  readonly variables: readonly RequiredVariable[];

  constructor(variables: RequiredVariable[]) {
    super(`Invalid server configuration: ${variables.join(", ")}`);
    this.name = "RuntimeConfigError";
    this.variables = Object.freeze([...variables]);
  }
}

function normalizeSupabaseUrl(value: string | undefined) {
  if (!value) return null;

  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    const bareHostname = hostname.replace(/^\[|\]$/g, "");
    const unsafeHost =
      isIP(bareHostname) !== 0 ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal");

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash ||
      url.port ||
      url.pathname !== "/" ||
      unsafeHost ||
      !hostname.includes(".")
    ) {
      return null;
    }

    return url.origin + url.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

function normalizeServiceRoleKey(value: string | undefined) {
  const key = value?.trim();

  if (
    !key ||
    /\s/.test(key) ||
    !(
      /^sb_secret_[A-Za-z0-9._-]{24,}$/.test(key) ||
      /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)
    )
  ) {
    return null;
  }
  return key;
}

function normalizeAddress(value: string | undefined) {
  if (!value) return null;

  try {
    return getAddress(value.trim());
  } catch {
    return null;
  }
}

export function getServerRuntimeConfig(env: Environment): ServerRuntimeConfig {
  const supabaseUrl = normalizeSupabaseUrl(env.SUPABASE_URL);
  const supabaseServiceRoleKey = normalizeServiceRoleKey(
    env.SUPABASE_SERVICE_ROLE_KEY
  );
  const invoiceRegistryAddress = normalizeAddress(
    env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS
  );
  const invalid: RequiredVariable[] = [];

  if (!supabaseUrl) invalid.push("SUPABASE_URL");
  if (!supabaseServiceRoleKey) invalid.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!invoiceRegistryAddress) {
    invalid.push("NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS");
  }
  if (
    invalid.length ||
    !supabaseUrl ||
    !supabaseServiceRoleKey ||
    !invoiceRegistryAddress
  ) {
    throw new RuntimeConfigError(invalid);
  }

  return Object.freeze({
    supabaseUrl,
    supabaseServiceRoleKey,
    invoiceRegistryAddress,
    chainId: ARC_TESTNET.chainId,
    rpcUrl: ARC_TESTNET.rpcUrl,
    explorerUrl: ARC_TESTNET.explorerUrl,
    usdcAddress: ARC_CONTRACTS.usdc
  });
}
