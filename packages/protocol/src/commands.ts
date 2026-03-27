export type QclawAttachmentInput = {
  type?: "image" | "audio" | "video" | "file";
  mimeType?: string;
  fileName?: string;
  content: string;
};

export type ChatSendCommand = {
  type: "chat.send";
  sessionKey: string;
  message: string;
  thinking?: string;
  attachments?: QclawAttachmentInput[];
  idempotencyKey: string;
  timeoutMs?: number;
  metadata?: Record<string, unknown>;
};

export type ChatAbortCommand = {
  type: "chat.abort";
  sessionKey: string;
  runId?: string;
};

export type ChatHistoryCommand = {
  type: "chat.history";
  sessionKey: string;
  limit?: number;
};

export type SessionBindCommand = {
  type: "session.bind";
  sessionKey: string;
  reason?: "channel-switch" | "resume" | "bootstrap";
};

export type QclawCommand =
  | ChatSendCommand
  | ChatAbortCommand
  | ChatHistoryCommand
  | SessionBindCommand;