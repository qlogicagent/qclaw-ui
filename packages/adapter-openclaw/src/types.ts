export type OpenclawMessageContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string }
  | { type: "image"; url: string }
  | { type: "image_url"; image_url: { url: string } }
  | { type: "audio"; url: string }
  | { type: "video"; url: string }
  | { type: "file"; url: string };

export type OpenclawWsBroadcastPayload =
  | {
      runId: string;
      sessionKey: string;
      seq: number;
      state: "delta";
      message: {
        role: "assistant";
        content: OpenclawMessageContentBlock[];
        timestamp: number;
      };
    }
  | {
      runId: string;
      sessionKey: string;
      seq: number;
      state: "tool-status";
      tool: {
        toolCallId: string;
        name: string;
        emoji?: string;
        label: string;
        verb?: string;
        status: "running" | "done" | "error";
        durationMs?: number;
      };
    }
  | {
      runId: string;
      sessionKey: string;
      seq: number;
      state: "step-progress";
      step: {
        stepIndex: number;
        stepTotal?: number;
        label: string;
        status: "running" | "done" | "error";
        isComplete?: boolean;
        parallelGroup?: string;
        isParallel?: boolean;
      };
    }
  | {
      runId: string;
      sessionKey: string;
      seq: number;
      state: "activity";
      activity: {
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
    }
  | {
      runId: string;
      sessionKey: string;
      seq: number;
      state: "final";
      stopReason?: string;
      toolsUsed?: Array<{
        toolCallId: string;
        name: string;
        emoji?: string;
        label: string;
        status: "running" | "done" | "error";
        durationMs?: number;
      }>;
      message?: {
        role: "assistant";
        content: OpenclawMessageContentBlock[];
        timestamp: number;
        usage?: unknown;
        model?: string;
        provider?: string;
        cost?: unknown;
      };
    }
  | {
      runId: string;
      sessionKey: string;
      seq: number;
      state: "error";
      errorMessage?: string;
      toolsUsed?: Array<{
        toolCallId: string;
        name: string;
        emoji?: string;
        label: string;
        status: "running" | "done" | "error";
        durationMs?: number;
      }>;
    }
  | {
      runId: string;
      sessionKey: string;
      seq: number;
      state: "aborted";
      stopReason?: string;
      message?: {
        role: "assistant";
        content: OpenclawMessageContentBlock[];
        timestamp: number;
      };
    };

export type OpenclawAuthOptions = {
  token?: string;
  headers?: Record<string, string>;
};

export type OpenclawHistoryMessage = {
  id?: string;
  role?: string;
  runId?: string;
  idempotencyKey?: string;
  content?: string | OpenclawMessageContentBlock[];
  timestamp?: number;
  usage?: unknown;
  model?: string;
  provider?: string;
  cost?: unknown;
  openclawAbort?: {
    aborted?: boolean;
    origin?: string;
    runId?: string;
  };
};

export type OpenclawHistoryResult = {
  sessionKey: string;
  sessionId?: string;
  messages: OpenclawHistoryMessage[];
  thinkingLevel?: string;
  verboseLevel?: string;
};

export type OpenclawConnectionOptions = {
  baseHttpUrl: string;
  baseWsUrl?: string;
  token?: string;
};