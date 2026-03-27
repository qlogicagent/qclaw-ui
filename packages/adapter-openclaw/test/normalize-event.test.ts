import { describe, expect, it } from "vitest";

import { normalizeOpenclawWsPayload } from "../src/normalize-event.js";

describe("normalizeOpenclawWsPayload", () => {
  it("splits delta into text and thinking events", () => {
    const events = normalizeOpenclawWsPayload({
      runId: "run-1",
      sessionKey: "session-1",
      seq: 10,
      state: "delta",
      message: {
        role: "assistant",
        timestamp: 1,
        content: [
          { type: "thinking", thinking: "分析中" },
          { type: "text", text: "结果" },
        ],
      },
    });

    expect(events.map((event) => event.kind)).toEqual(["thinking-delta", "text-delta"]);
  });

  it("emits final and message-upsert", () => {
    const events = normalizeOpenclawWsPayload({
      runId: "run-1",
      sessionKey: "session-1",
      seq: 11,
      state: "final",
      message: {
        role: "assistant",
        timestamp: 1,
        model: "gpt-test",
        content: [
          { type: "text", text: "hello" },
          { type: "image", url: "https://example.com/a.png" },
        ],
      },
    });

    expect(events.map((event) => event.kind)).toEqual(["final", "message-upsert"]);
  });
});