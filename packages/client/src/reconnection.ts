export function nextReconnectDelay(attempt: number): number {
  const base = 1_000;
  return Math.min(base * 2 ** Math.max(0, attempt - 1), 15_000);
}