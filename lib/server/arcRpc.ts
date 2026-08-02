import "server-only";

import {
  BaseError,
  createPublicClient,
  fallback,
  http
} from "viem";
import { arcTestnet } from "../chains.ts";
import { getServerRuntimeConfig } from "./runtimeConfig.ts";

const transportOptions = {
  timeout: 12_000,
  retryCount: 1,
  retryDelay: 400
} as const;

type ErrorLike = {
  readonly cause?: unknown;
  readonly code?: unknown;
  readonly details?: unknown;
  readonly name?: unknown;
  readonly status?: unknown;
};

function errorChain(error: unknown) {
  const errors: ErrorLike[] = [];
  const seen = new Set<unknown>();
  let current = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    errors.push(current as ErrorLike);
    current = (current as ErrorLike).cause;
  }

  return errors;
}

function rpcError(errors: readonly ErrorLike[]) {
  return errors.find((error) => typeof error.code === "number");
}

function isTransientTransportError(error: Error) {
  const errors = errorChain(error);
  if (rpcError(errors)) return false;

  const status = errors.find((item) => typeof item.status === "number")?.status;
  if (typeof status === "number") {
    return status === 408 || status === 429 || status >= 500;
  }

  return errors.some(
    (item) => item.name === "HttpRequestError" || item.name === "TimeoutError"
  );
}

function redactEndpointValues(value: string, rpcUrls: readonly string[]) {
  let redacted = value.replace(/https?:\/\/[^\s]+/gi, "[redacted endpoint]");

  for (const rpcUrl of rpcUrls) {
    redacted = redacted.replaceAll(rpcUrl, "[redacted endpoint]");
    try {
      const token = new URL(rpcUrl).pathname.split("/").filter(Boolean).at(-1);
      if (token) redacted = redacted.replaceAll(token, "[redacted endpoint]");
    } catch {
      // Explicit URLs are consumed by viem; no additional error is needed here.
    }
  }

  return redacted;
}

class ArcRpcRequestError extends BaseError {
  readonly code?: number;
  readonly status?: number;

  constructor(error: unknown, rpcUrls: readonly string[]) {
    const errors = errorChain(error);
    const rpc = rpcError(errors);
    const rawRpc = errors.find(
      (item) => item.name === "RpcRequestError" && typeof item.details === "string"
    );
    const status = errors.find((item) => typeof item.status === "number")?.status;
    const semantic = typeof rpc?.code === "number";
    const shortMessage = semantic
      ? "Arc RPC request failed."
      : "Arc RPC transport failed.";
    const details = redactEndpointValues(
      semantic && typeof rawRpc?.details === "string"
        ? rawRpc.details
        : "The Arc RPC endpoint is unavailable.",
      rpcUrls
    );

    super(shortMessage, { details });
    this.name = semantic ? "ArcRpcSemanticError" : "ArcRpcTransportError";
    if (semantic) this.code = rpc.code;
    if (typeof status === "number") this.status = status;
  }
}

function createArcTransport(rpcUrls: readonly string[]) {
  const transport = fallback(
    rpcUrls.map((url) => http(url, transportOptions)),
    {
      rank: false,
      retryCount: 0,
      shouldThrow: (error) => !isTransientTransportError(error)
    }
  );

  return (parameters: Parameters<typeof transport>[0]) => {
    const inner = transport(parameters);
    const request = (async (args: any, options?: any) => {
      try {
        return await inner.request(args, options);
      } catch (error) {
        throw new ArcRpcRequestError(error, rpcUrls);
      }
    }) as typeof inner.request;

    return {
      ...inner,
      config: { ...inner.config, request },
      request
    };
  };
}

export function createArcServerClient(rpcUrls?: readonly string[]) {
  const urls = rpcUrls ?? getServerRuntimeConfig().rpcUrls;

  return createPublicClient({
    chain: arcTestnet,
    transport: createArcTransport(urls)
  });
}
