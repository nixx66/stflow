export const ARC_BUSY_MESSAGE =
  "Arc Testnet is temporarily busy. Please retry in a few seconds.";

const retryDelays = [300, 900] as const;

type RpcError = {
  cause?: unknown;
  message?: unknown;
  status?: unknown;
};

function errorChain(error: unknown) {
  const errors: RpcError[] = [];
  const seen = new Set<unknown>();
  let current = error;

  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    errors.push(current as RpcError);
    current = (current as RpcError).cause;
  }

  return errors;
}

export function isTransientArcRpcError(error: unknown) {
  return errorChain(error).some((item) => {
    if (typeof item.status === "number" && (item.status === 429 || item.status >= 500)) {
      return true;
    }

    const message = typeof item.message === "string" ? item.message.toLowerCase() : "";
    return (
      /request limit reached|rate limit|too many requests|\b429\b/.test(message) ||
      /failed to fetch|fetch failed|network error|timed? ?out|timeout/.test(message) ||
      /(?:status|status code|http)\D*5\d\d/.test(message)
    );
  });
}

function wait(delay: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, delay));
}

export async function retryArcRead<T>(
  read: () => Promise<T>,
  sleep: (delay: number) => Promise<void> = wait
) {
  for (let attempt = 0; attempt <= retryDelays.length; attempt += 1) {
    try {
      return await read();
    } catch (error) {
      if (!isTransientArcRpcError(error)) throw error;
      if (attempt === retryDelays.length) throw new Error(ARC_BUSY_MESSAGE);
      await sleep(retryDelays[attempt]);
    }
  }

  throw new Error(ARC_BUSY_MESSAGE);
}
