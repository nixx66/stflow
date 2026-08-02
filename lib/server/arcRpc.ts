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

function decoded(value: string) {
  try {
    return decodeURIComponent(value.replaceAll("+", " "));
  } catch {
    return value;
  }
}

const minimumSecretLength = 8;

function addSecretVariants(values: Set<string>, value: string) {
  const variants = [
    value,
    decoded(value),
    encodeURIComponent(value),
    encodeURIComponent(decoded(value))
  ];

  for (const variant of variants) {
    if (variant.length >= minimumSecretLength) values.add(variant);
  }
}

function rawAuthorityCredentials(rpcUrl: string) {
  const authority = /^[a-z][a-z0-9+.-]*:\/\/([^/?#]*)/i.exec(rpcUrl)?.[1];
  const at = authority?.lastIndexOf("@") ?? -1;
  if (!authority || at < 0) return [];

  const userInfo = authority.slice(0, at);
  const separator = userInfo.indexOf(":");
  return separator < 0
    ? [userInfo]
    : [userInfo.slice(0, separator), userInfo.slice(separator + 1)];
}

function endpointSecretValues(rpcUrls: readonly string[]) {
  const values = new Set<string>();

  for (const rpcUrl of rpcUrls) {
    addSecretVariants(values, rpcUrl);
    for (const credential of rawAuthorityCredentials(rpcUrl)) {
      addSecretVariants(values, credential);
    }
    try {
      const url = new URL(rpcUrl);
      for (const credential of [url.username, url.password]) {
        if (credential) addSecretVariants(values, credential);
      }
      for (const parameter of url.search.slice(1).split("&")) {
        const separator = parameter.indexOf("=");
        const value = separator >= 0 ? parameter.slice(separator + 1) : "";
        if (value) addSecretVariants(values, value);
      }
      const pathToken = url.pathname.split("/").filter(Boolean).at(-1);
      if (pathToken && pathToken.length >= 8) {
        addSecretVariants(values, pathToken);
      }
    } catch {
      // Viem will report an invalid explicit URL without exposing it from this boundary.
    }
  }

  return [...values].filter(Boolean).sort((left, right) => right.length - left.length);
}

function redactEndpointValues(value: string, rpcUrls: readonly string[]) {
  let redacted = value.replace(/https?:\/\/[^\s]+/gi, "[redacted endpoint]");

  for (const secret of endpointSecretValues(rpcUrls)) {
    redacted = redacted.replaceAll(secret, "[redacted endpoint]");
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
