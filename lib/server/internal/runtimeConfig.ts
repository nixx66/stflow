import { isIP } from "node:net";
import { getAddress, type Address } from "viem";
import { ARC_CONTRACTS, ARC_TESTNET } from "../../arc.ts";

const requiredVariables = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS"
] as const;
const configVariables = [...requiredVariables, "ARC_RPC_URL"] as const;

type ConfigVariable = (typeof configVariables)[number];
type Environment = Record<string, string | undefined>;

export type ServerRuntimeConfig = Readonly<{
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  invoiceRegistryAddress: Address;
  chainId: typeof ARC_TESTNET.chainId;
  rpcUrls: readonly [string, ...string[]];
  rpcUrl: string;
  explorerUrl: typeof ARC_TESTNET.explorerUrl;
  usdcAddress: typeof ARC_CONTRACTS.usdc;
}>;

export class RuntimeConfigError extends Error {
  readonly variables: readonly ConfigVariable[];

  constructor(variables: ConfigVariable[]) {
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

function isServiceRoleJwt(key: string) {
  const parts = key.split(".");
  if (
    parts.length !== 3 ||
    parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
  ) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8")
    ) as unknown;
    return (
      typeof payload === "object" &&
      payload !== null &&
      "role" in payload &&
      payload.role === "service_role"
    );
  } catch {
    return false;
  }
}

function normalizeServiceRoleKey(value: string | undefined) {
  const key = value?.trim();

  if (
    !key ||
    /\s/.test(key) ||
    !(
      /^sb_secret_[A-Za-z0-9._-]{24,}$/.test(key) ||
      isServiceRoleJwt(key)
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

function normalizeArcRpcUrl(value: string | undefined) {
  const endpoint = value?.trim();
  if (!endpoint) return null;

  try {
    const url = new URL(endpoint);
    const hostname = url.hostname.toLowerCase();
    const bareHostname = hostname.replace(/^\[|\]$/g, "");
    const authority = endpoint
      .slice(endpoint.indexOf("://") + 3)
      .split(/[/?#]/, 1)[0]
      .replace(/^.*@/, "");
    const hasExplicitPort = authority.startsWith("[")
      ? /^\[[^\]]+\]:\d+$/.test(authority)
      : /:\d+$/.test(authority);
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
      hasExplicitPort ||
      unsafeHost ||
      hostname !== "arc-testnet.g.alchemy.com" ||
      !/^\/v2\/[^/]+$/.test(url.pathname)
    ) {
      return null;
    }

    return url.origin + url.pathname;
  } catch {
    return null;
  }
}

export function parseServerRuntimeConfig(env: Environment): ServerRuntimeConfig {
  const supabaseUrl = normalizeSupabaseUrl(env.SUPABASE_URL);
  const supabaseServiceRoleKey = normalizeServiceRoleKey(
    env.SUPABASE_SERVICE_ROLE_KEY
  );
  const invoiceRegistryAddress = normalizeAddress(
    env.NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS
  );
  const privateRpcUrl = normalizeArcRpcUrl(env.ARC_RPC_URL);
  const invalid: ConfigVariable[] = [];

  if (!supabaseUrl) invalid.push("SUPABASE_URL");
  if (!supabaseServiceRoleKey) invalid.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!invoiceRegistryAddress) {
    invalid.push("NEXT_PUBLIC_INVOICE_REGISTRY_ADDRESS");
  }
  if (env.ARC_RPC_URL?.trim() && !privateRpcUrl) {
    invalid.push("ARC_RPC_URL");
  }
  if (
    invalid.length ||
    !supabaseUrl ||
    !supabaseServiceRoleKey ||
    !invoiceRegistryAddress
  ) {
    throw new RuntimeConfigError(invalid);
  }

  const rpcUrls = privateRpcUrl
    ? (Object.freeze([privateRpcUrl, ARC_TESTNET.rpcUrl]) as readonly [
        string,
        ...string[]
      ])
    : (Object.freeze([ARC_TESTNET.rpcUrl]) as readonly [string, ...string[]]);

  return Object.freeze({
    supabaseUrl,
    supabaseServiceRoleKey,
    invoiceRegistryAddress,
    chainId: ARC_TESTNET.chainId,
    rpcUrls,
    rpcUrl: rpcUrls[0],
    explorerUrl: ARC_TESTNET.explorerUrl,
    usdcAddress: ARC_CONTRACTS.usdc
  });
}
