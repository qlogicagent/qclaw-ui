import { describe, expect, it } from "vitest";

import type { ChatSendCommand, QclawEventEnvelope } from "../src/index.js";

describe("protocol types", () => {
  it("accepts chat.send shape", () => {
    const command: ChatSendCommand = {
      type: "chat.send",
      sessionKey: "session-1",
      message: "hello",
      idempotencyKey: "id-1",
    };

    expect(command.type).toBe("chat.send");
  });

  it("accepts generic event envelope", () => {
    const event: QclawEventEnvelope<{ text: string }, "text-delta"> = {
      kind: "text-delta",
      runId: "run-1",
      sessionKey: "session-1",
      seq: 1,
      payload: { text: "delta" },
    };

    expect(event.payload.text).toBe("delta");
  });
});