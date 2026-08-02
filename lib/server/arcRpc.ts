import "server-only";

import { createPublicClient, fallback, http } from "viem";
import { arcTestnet } from "../chains.ts";
import { getServerRuntimeConfig } from "./runtimeConfig.ts";

const transportOptions = {
  timeout: 12_000,
  retryCount: 1,
  retryDelay: 400
} as const;

export function createArcServerClient(rpcUrls?: readonly string[]) {
  const urls = rpcUrls ?? getServerRuntimeConfig().rpcUrls;

  return createPublicClient({
    chain: arcTestnet,
    transport: fallback(
      urls.map((url) => http(url, transportOptions)),
      { rank: false, retryCount: 0 }
    )
  });
}
