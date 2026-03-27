import type { QclawMessage } from "@qclaw-ui/protocol";

export type MessageStoreState = Record<string, QclawMessage[]>;

export function replaceSessionMessages(
  state: MessageStoreState,
  sessionKey: string,
  messages: QclawMessage[],
): MessageStoreState {
  return {
    ...state,
    [sessionKey]: dedupeMessages(messages),
  };
}

export function upsertSessionMessage(
  state: MessageStoreState,
  sessionKey: string,
  message: QclawMessage,
): MessageStoreState {
  const current = state[sessionKey] ?? [];
  const index = current.findIndex((entry) => entry.messageId === message.messageId);
  if (index < 0) {
    return {
      ...state,
      [sessionKey]: [...current, message],
    };
  }

  const next = current.slice();
  next[index] = message;
  return {
    ...state,
    [sessionKey]: next,
  };
}

function dedupeMessages(messages: QclawMessage[]): QclawMessage[] {
  const map = new Map<string, QclawMessage>();
  for (const message of messages) {
    map.set(message.messageId, message);
  }
  return Array.from(map.values());
}