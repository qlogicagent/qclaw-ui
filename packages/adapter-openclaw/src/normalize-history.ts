import type { FinalMetaPayload, MessageContentBlock, QclawMessage } from "@qclaw-ui/protocol";

import type { OpenclawHistoryMessage, OpenclawHistoryResult, OpenclawMessageContentBlock } from "./types.js";

export function normalizeOpenclawHistory(result: OpenclawHistoryResult): QclawMessage[] {
  return (result.messages ?? []).map((message, index) => normalizeOpenclawHistoryMessage(result.sessionKey, message, index));
}

export function normalizeOpenclawHistoryMessage(
  sessionKey: string,
  message: OpenclawHistoryMessage,
  index: number,
): QclawMessage {
  const role = normalizeRole(message.role);
  const content = normalizeHistoryContent(message.content);
  const meta = normalizeMeta(message);
  const runId = resolveHistoryRunId(message);

  return {
    messageId: message.id ?? `${sessionKey}:${role}:${index}`,
    role,
    sessionKey,
    ...(runId ? { runId } : {}),
    content,
    ...(meta ? { meta } : {}),
  };
}

function resolveHistoryRunId(message: OpenclawHistoryMessage): string | undefined {
  if (message.runId?.trim()) {
    return message.runId.trim();
  }
  if (message.openclawAbort?.runId?.trim()) {
    return message.openclawAbort.runId.trim();
  }
  if (!message.idempotencyKey?.trim()) {
    return undefined;
  }
  const key = message.idempotencyKey.trim();
  return key.replace(/^(user|assistant|error):/, "").trim() || undefined;
}

function normalizeRole(role: string | undefined): QclawMessage["role"] {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }
  return "assistant";
}

function normalizeHistoryContent(content: OpenclawHistoryMessage["content"]): MessageContentBlock[] {
  if (typeof content === "string") {
    return content ? [{ type: "text", text: content }] : [];
  }

  const blocks: MessageContentBlock[] = [];
  for (const block of content ?? []) {
    blocks.push(...convertContentBlock(block));
  }
  return blocks;
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

function normalizeMeta(message: OpenclawHistoryMessage): FinalMetaPayload | undefined {
  const meta: FinalMetaPayload = {
    ...(message.timestamp != null ? { timestamp: message.timestamp } : {}),
    ...(message.usage !== undefined ? { usage: message.usage } : {}),
    ...(message.model ? { model: message.model } : {}),
    ...(message.provider ? { provider: message.provider } : {}),
    ...(message.cost !== undefined ? { cost: message.cost } : {}),
  };

  return Object.keys(meta).length > 0 ? meta : undefined;
}