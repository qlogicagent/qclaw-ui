import type { OpenclawConnectionOptions } from "./types.js";

export function buildOpenclawWsUrl(options: OpenclawConnectionOptions): string {
  if (options.baseWsUrl) {
    return withToken(options.baseWsUrl, options.token);
  }

  const httpUrl = new URL(options.baseHttpUrl);
  httpUrl.protocol = httpUrl.protocol === "https:" ? "wss:" : "ws:";
  return withToken(httpUrl.toString(), options.token);
}

function withToken(baseUrl: string, token?: string): string {
  if (!token) {
    return baseUrl;
  }
  const url = new URL(baseUrl);
  url.searchParams.set("token", token);
  return url.toString();
}