import type {
  AbortedEvent,
  MediaBlock,
  MessageContentBlock,
  MessageUpsertEvent,
  QclawEvent,
  QclawEventEnvelope,
  SessionBoundEvent,
} from "@qclaw-ui/protocol";

import type { OpenclawMessageContentBlock, OpenclawWsBroadcastPayload } from "./types.js";

export function normalizeOpenclawWsPayload(payload: OpenclawWsBroadcastPayload): QclawEvent[] {
  switch (payload.state) {
    case "delta":
      return normalizeDelta(payload);
    case "tool-status":
      return [
        envelope(payload, "tool-status", {
          toolCallId: payload.tool.toolCallId,
          name: payload.tool.name,
          label: payload.tool.label,
          status: payload.tool.status,
          ...(payload.tool.emoji ? { emoji: payload.tool.emoji } : {}),
          ...(payload.tool.verb ? { verb: payload.tool.verb } : {}),
          ...(payload.tool.durationMs != null ? { durationMs: payload.tool.durationMs } : {}),
        }),
      ];
    case "step-progress":
      return [
        envelope(payload, "step-progress", {
          stepIndex: payload.step.stepIndex,
          label: payload.step.label,
          status: payload.step.status,
          ...(payload.step.stepTotal != null ? { stepTotal: payload.step.stepTotal } : {}),
          ...(payload.step.isComplete != null ? { isComplete: payload.step.isComplete } : {}),
          ...(payload.step.parallelGroup ? { parallelGroup: payload.step.parallelGroup } : {}),
          ...(payload.step.isParallel != null ? { isParallel: payload.step.isParallel } : {}),
        }),
      ];
    case "activity":
      return [
        envelope(payload, "activity", {
          activityId: payload.activity.activityId,
          activityType: payload.activity.activityType,
          label: payload.activity.label,
          status: payload.activity.status,
          ...(payload.activity.durationMs != null ? { durationMs: payload.activity.durationMs } : {}),
          ...(payload.activity.stepIndex != null ? { stepIndex: payload.activity.stepIndex } : {}),
          ...(payload.activity.stepTotal != null ? { stepTotal: payload.activity.stepTotal } : {}),
          ...(payload.activity.detail ? { detail: payload.activity.detail } : {}),
        }),
      ];
    case "final":
      return normalizeFinal(payload);
    case "error":
      return [
        envelope(payload, "error", {
          message: payload.errorMessage ?? "Unknown openclaw error",
          ...(payload.toolsUsed?.length ? { toolsUsed: payload.toolsUsed } : {}),
        }),
      ];
    case "aborted":
      return normalizeAborted(payload);
  }
}

export function createSessionBoundEvent(params: {
  sessionKey: string;
  runId?: string;
  seq?: number;
  reason?: "channel-switch" | "resume" | "bootstrap";
}): SessionBoundEvent {
  return {
    kind: "session-bound",
    sessionKey: params.sessionKey,
    runId: params.runId ?? `session-bound:${params.sessionKey}`,
    seq: params.seq ?? 0,
    ts: Date.now(),
    payload: {
      ...(params.reason ? { reason: params.reason } : {}),
    },
    source: "adapter",
  };
}

function normalizeDelta(
  payload: Extract<OpenclawWsBroadcastPayload, { state: "delta" }>,
): QclawEvent[] {
  const events: QclawEvent[] = [];
  let offset = 0;

  for (const block of payload.message.content) {
    if (block.type === "text" && block.text) {
      events.push(
        envelope(payload, "text-delta", {
          text: block.text,
        }, offset++),
      );
    }
    if (block.type === "thinking" && block.thinking) {
      events.push(
        envelope(payload, "thinking-delta", {
          text: block.thinking,
        }, offset++),
      );
    }
  }

  return events;
}

function normalizeFinal(
  payload: Extract<OpenclawWsBroadcastPayload, { state: "final" }>,
): QclawEvent[] {
  const text = collectText(payload.message?.content);
  const media = collectMedia(payload.message?.content);
  const meta = payload.message
    ? {
        timestamp: payload.message.timestamp,
        ...(payload.message.usage !== undefined ? { usage: payload.message.usage } : {}),
        ...(payload.message.model ? { model: payload.message.model } : {}),
        ...(payload.message.provider ? { provider: payload.message.provider } : {}),
        ...(payload.message.cost !== undefined ? { cost: payload.message.cost } : {}),
      }
    : undefined;

  const events: QclawEvent[] = [
    envelope(payload, "final", {
      ...(text ? { text } : {}),
      ...(payload.stopReason ? { stopReason: payload.stopReason } : {}),
      ...(payload.toolsUsed?.length ? { toolsUsed: payload.toolsUsed } : {}),
      ...(media ? { media } : {}),
      ...(meta ? { meta } : {}),
    }),
  ];

  const message = createMessageUpsert(payload);
  if (message) {
    events.push(message);
  }

  return events;
}

function normalizeAborted(
  payload: Extract<OpenclawWsBroadcastPayload, { state: "aborted" }>,
): QclawEvent[] {
  const partialText = collectText(payload.message?.content);
  const aborted: AbortedEvent = envelope(payload, "aborted", {
    ...(payload.stopReason ? { stopReason: payload.stopReason } : {}),
    ...(partialText ? { partialText } : {}),
  });

  const events: QclawEvent[] = [aborted];
  const message = createMessageUpsert(payload);
  if (message) {
    events.push(message);
  }
  return events;
}

function createMessageUpsert(
  payload: Extract<OpenclawWsBroadcastPayload, { state: "final" | "aborted" }>,
): MessageUpsertEvent | null {
  if (!payload.message?.content?.length) {
    return null;
  }

  const content = payload.message.content.flatMap(convertContentBlock);
  if (!content.length) {
    return null;
  }

  return envelope(payload, "message-upsert", {
    messageId: `${payload.runId}:assistant`,
    role: "assistant",
    content,
    ...(payload.state === "final" && payload.message
      ? {
          meta: {
            timestamp: payload.message.timestamp,
            ...(payload.message.usage !== undefined ? { usage: payload.message.usage } : {}),
            ...(payload.message.model ? { model: payload.message.model } : {}),
            ...(payload.message.provider ? { provider: payload.message.provider } : {}),
            ...(payload.message.cost !== undefined ? { cost: payload.message.cost } : {}),
          },
        }
      : {}),
  });
}

function convertContentBlock(block: OpenclawMessageContentBlock): MessageContentBlock[] {
  switch (block.type) {
    case "text":
      return block.text ? [{ type: "text", text: block.text }] : [];
    case "thinking":
      return block.thinking ? [{ type: "thinking", text: block.thinking }] : [];
    case "image":
      return [{ type: "image", url: block.url }];
    case "image_url":
      return [{ type: "image", url: block.image_url.url }];
    case "audio":
      return [{ type: "audio", url: block.url }];
    case "video":
      return [{ type: "video", url: block.url }];
    case "file":
      return [{ type: "file", url: block.url }];
  }
}

function collectText(content: OpenclawMessageContentBlock[] | undefined): string | undefined {
  const text = (content ?? [])
    .flatMap((block) => {
      switch (block.type) {
        case "text":
          return [block.text];
        default:
          return [];
      }
    })
    .join("");

  return text || undefined;
}

function collectMedia(content: OpenclawMessageContentBlock[] | undefined): MediaBlock[] | undefined {
  const media: MediaBlock[] = [];

  for (const block of content ?? []) {
    switch (block.type) {
      case "image":
        media.push({ type: "image", url: block.url });
        break;
      case "image_url":
        media.push({ type: "image", url: block.image_url.url });
        break;
      case "audio":
        media.push({ type: "audio", url: block.url });
        break;
      case "video":
        media.push({ type: "video", url: block.url });
        break;
      case "file":
        media.push({ type: "file", url: block.url });
        break;
      default:
        break;
    }
  }

  return media.length ? media : undefined;
}

function envelope<TPayload, TKind extends QclawEventEnvelope<TPayload>["kind"]>(
  payload: OpenclawWsBroadcastPayload,
  kind: TKind,
  body: TPayload,
  seqOffset = 0,
): QclawEventEnvelope<TPayload, TKind> {
  return {
    kind,
    runId: payload.runId,
    sessionKey: payload.sessionKey,
    seq: payload.seq + seqOffset,
    ts: Date.now(),
    payload: body,
    source: "openclaw",
  };
}