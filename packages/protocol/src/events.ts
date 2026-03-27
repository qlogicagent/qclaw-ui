export type QclawEventKind =
  | "text-delta"
  | "thinking-delta"
  | "tool-status"
  | "step-progress"
  | "activity"
  | "final"
  | "error"
  | "aborted"
  | "message-upsert"
  | "session-bound";

export type QclawEventEnvelope<TPayload = unknown, TKind extends QclawEventKind = QclawEventKind> = {
  kind: TKind;
  runId: string;
  sessionKey: string;
  seq: number;
  ts?: number;
  payload: TPayload;
  source?: "openclaw" | "host" | "adapter";
};

export type ToolUsageSummary = {
  toolCallId: string;
  name: string;
  label: string;
  emoji?: string;
  status: "running" | "done" | "error";
  durationMs?: number;
};

export type TextDeltaPayload = {
  text: string;
};

export type ThinkingDeltaPayload = {
  text: string;
};

export type ToolStatusPayload = {
  toolCallId: string;
  name: string;
  label: string;
  emoji?: string;
  verb?: string;
  status: "running" | "done" | "error";
  durationMs?: number;
};

export type StepProgressPayload = {
  stepIndex: number;
  stepTotal?: number;
  label: string;
  status: "running" | "done" | "error";
  isComplete?: boolean;
  parallelGroup?: string;
  isParallel?: boolean;
};

export type ActivityPayload = {
  activityId: string;
  activityType: "thinking" | "tool-call" | "step" | "sub-agent";
  label: string;
  status: "running" | "done" | "error" | "aborted";
  durationMs?: number;
  stepIndex?: number;
  stepTotal?: number;
  detail?: {
    input?: string;
    output?: string;
    model?: string;
    error?: string;
    streamingText?: string;
  };
};

export type FinalMetaPayload = {
  timestamp?: number;
  usage?: unknown;
  model?: string;
  provider?: string;
  cost?: unknown;
};

export type MediaBlock =
  | { type: "image"; url: string }
  | { type: "audio"; url: string }
  | { type: "video"; url: string }
  | { type: "file"; url: string };

export type FinalPayload = {
  text?: string;
  stopReason?: string;
  toolsUsed?: ToolUsageSummary[];
  media?: MediaBlock[];
  meta?: FinalMetaPayload;
};

export type ErrorPayload = {
  message: string;
  code?: string;
  isRetryable?: boolean;
  toolsUsed?: ToolUsageSummary[];
};

export type AbortedPayload = {
  stopReason?: string;
  partialText?: string;
};

export type MessageContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; text: string }
  | MediaBlock;

export type MessageUpsertPayload = {
  messageId: string;
  role: "user" | "assistant" | "system";
  content: MessageContentBlock[];
  meta?: FinalMetaPayload;
};

export type SessionBoundPayload = {
  reason?: "channel-switch" | "resume" | "bootstrap";
};

export type TextDeltaEvent = QclawEventEnvelope<TextDeltaPayload, "text-delta">;
export type ThinkingDeltaEvent = QclawEventEnvelope<ThinkingDeltaPayload, "thinking-delta">;
export type ToolStatusEvent = QclawEventEnvelope<ToolStatusPayload, "tool-status">;
export type StepProgressEvent = QclawEventEnvelope<StepProgressPayload, "step-progress">;
export type ActivityEvent = QclawEventEnvelope<ActivityPayload, "activity">;
export type FinalEvent = QclawEventEnvelope<FinalPayload, "final">;
export type ErrorEvent = QclawEventEnvelope<ErrorPayload, "error">;
export type AbortedEvent = QclawEventEnvelope<AbortedPayload, "aborted">;
export type MessageUpsertEvent = QclawEventEnvelope<MessageUpsertPayload, "message-upsert">;
export type SessionBoundEvent = QclawEventEnvelope<SessionBoundPayload, "session-bound">;

export type QclawEvent =
  | TextDeltaEvent
  | ThinkingDeltaEvent
  | ToolStatusEvent
  | StepProgressEvent
  | ActivityEvent
  | FinalEvent
  | ErrorEvent
  | AbortedEvent
  | MessageUpsertEvent
  | SessionBoundEvent;