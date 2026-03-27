import { normalizeOpenclawHistory, type OpenclawHistoryResult } from "@qclaw-ui/adapter-openclaw";

import type { QclawMessage } from "@qclaw-ui/protocol";

export function loadHistoryMessages(result: OpenclawHistoryResult): QclawMessage[] {
  return normalizeOpenclawHistory(result);
}