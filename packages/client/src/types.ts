import type { ActiveSessionState, QclawAttachmentInput, QclawMessage, QclawRunState } from "@qclaw-ui/protocol";

export type QclawConnectionStatus = "idle" | "connecting" | "connected" | "error" | "closed";

export type QclawClientSnapshot = {
  status: QclawConnectionStatus;
  activeSession: ActiveSessionState;
  messagesBySession: Record<string, QclawMessage[]>;
  runsBySession: Record<string, Record<string, QclawRunState>>;
  lastError?: string;
};

export type QclawGatewayConnectionOptions = {
  url: string;
  token?: string;
  password?: string;
  clientDisplayName?: string;
  platform?: string;
};

export type QclawSendMessageInput = {
  sessionKey: string;
  message: string;
  thinking?: string;
  attachments?: QclawAttachmentInput[];
  timeoutMs?: number;
};

export type QclawHistoryOptions = {
  sessionKey: string;
  limit?: number;
};