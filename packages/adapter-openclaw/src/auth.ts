import type { OpenclawAuthOptions } from "./types.js";

export function buildOpenclawAuthHeaders(options: OpenclawAuthOptions = {}): Record<string, string> {
  return {
    ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    ...(options.headers ?? {}),
  };
}