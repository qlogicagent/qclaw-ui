import type { ChatAbortCommand, ChatHistoryCommand, ChatSendCommand, SessionBindCommand } from "@qclaw-ui/protocol";

export type OpenclawRpcMethod = "chat.send" | "chat.abort" | "chat.history" | "session.bind";

export function toOpenclawRpcBody(
  command: ChatSendCommand | ChatAbortCommand | ChatHistoryCommand | SessionBindCommand,
): { method: OpenclawRpcMethod; params: Record<string, unknown> } {
  switch (command.type) {
    case "chat.send":
      return {
        method: "chat.send",
        params: {
          sessionKey: command.sessionKey,
          message: command.message,
          thinking: command.thinking,
          attachments: command.attachments,
          idempotencyKey: command.idempotencyKey,
          timeoutMs: command.timeoutMs,
          metadata: command.metadata,
        },
      };
    case "chat.abort":
      return {
        method: "chat.abort",
        params: {
          sessionKey: command.sessionKey,
          runId: command.runId,
        },
      };
    case "chat.history":
      return {
        method: "chat.history",
        params: {
          sessionKey: command.sessionKey,
          limit: command.limit,
        },
      };
    case "session.bind":
      return {
        method: "session.bind",
        params: {
          sessionKey: command.sessionKey,
          reason: command.reason,
        },
      };
  }
}