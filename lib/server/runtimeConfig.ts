import "server-only";

import {
  parseServerRuntimeConfig,
  RuntimeConfigError,
  type ServerRuntimeConfig
} from "./internal/runtimeConfig.ts";

export { RuntimeConfigError, type ServerRuntimeConfig };

export function getServerRuntimeConfig(
  env: Record<string, string | undefined> = process.env
) {
  return parseServerRuntimeConfig(env);
}
