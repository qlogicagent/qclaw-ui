import type { ActivityPayload, FinalMetaPayload, MessageContentBlock, StepProgressPayload, ToolStatusPayload } from "./events.js";

export type QclawMessage = {
  messageId: string;
  role: "user" | "assistant" | "system";
  sessionKey: string;
  runId?: string;
  content: MessageContentBlock[];
  meta?: FinalMetaPayload;
};

export type QclawRunState = {
  runId: string;
  sessionKey: string;
  text: string;
  thinking: string;
  tools: Record<string, ToolStatusPayload>;
  steps: Record<string, StepProgressPayload>;
  activities: Record<string, ActivityPayload>;
  status: "idle" | "running" | "final" | "error" | "aborted";
  meta?: FinalMetaPayload;
};

export type ActiveSessionState = {
  activeSessionKey: string | null;
  lastBoundAt?: number;
};