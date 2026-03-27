import {
  createSessionBoundEvent,
  normalizeOpenclawWsPayload,
  type OpenclawHistoryResult,
  type OpenclawWsBroadcastPayload,
} from "@qclaw-ui/adapter-openclaw";
import type { QclawEvent, QclawMessage } from "@qclaw-ui/protocol";

import { bindActiveSession, createActiveSessionState } from "./active-session.js";
import { loadHistoryMessages } from "./history-loader.js";
import { replaceSessionMessages, upsertSessionMessage } from "./message-store.js";
import { nextReconnectDelay } from "./reconnection.js";
import { applyRunEvent } from "./run-store.js";
import type {
  QclawClientSnapshot,
  QclawGatewayConnectionOptions,
  QclawHistoryOptions,
  QclawSendMessageInput,
} from "./types.js";

const PROTOCOL_VERSION = 3;

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
};

type GatewayEventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
};

type GatewayResponseFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    message?: string;
  };
};

export class QclawGatewayClient {
  private socket: WebSocket | null = null;

  private readonly listeners = new Set<(snapshot: QclawClientSnapshot) => void>();

  private readonly pending = new Map<string, PendingRequest>();

  private reconnectAttempt = 0;

  private manualClose = false;

  private snapshot: QclawClientSnapshot = {
    status: "idle",
    activeSession: createActiveSessionState(null),
    messagesBySession: {},
    runsBySession: {},
  };

  constructor(private readonly options: QclawGatewayConnectionOptions) {}

  subscribe(listener: (snapshot: QclawClientSnapshot) => void): () => void {
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getSnapshot(): QclawClientSnapshot {
    return this.snapshot;
  }

  connect() {
    this.manualClose = false;
    this.setSnapshot({ status: "connecting" }, { clearLastError: true });
    this.socket = new WebSocket(this.options.url);
    this.socket.addEventListener("message", (event) => this.handleMessage(String(event.data)));
    this.socket.addEventListener("close", () => {
      this.setSnapshot({ status: this.manualClose ? "closed" : "error" });
      this.rejectPending(new Error("gateway closed"));
      if (!this.manualClose) {
        this.scheduleReconnect();
      }
    });
    this.socket.addEventListener("error", () => {
      this.setSnapshot({ status: "error", lastError: "gateway connection error" });
    });
  }

  disconnect() {
    this.manualClose = true;
    this.socket?.close();
    this.socket = null;
    this.setSnapshot({ status: "closed" });
  }

  async bindSession(sessionKey: string) {
    this.snapshot = {
      ...this.snapshot,
      activeSession: bindActiveSession(sessionKey),
    };
    this.emit();

    this.applyEvents([
      createSessionBoundEvent({
        sessionKey,
        reason: "bootstrap",
      }),
    ]);

    return await this.loadHistory({ sessionKey });
  }

  async loadHistory(options: QclawHistoryOptions): Promise<QclawMessage[]> {
    const result = (await this.request("chat.history", {
      sessionKey: options.sessionKey,
      ...(options.limit != null ? { limit: options.limit } : {}),
    })) as OpenclawHistoryResult;

    const messages = loadHistoryMessages(result);
    this.snapshot = {
      ...this.snapshot,
      messagesBySession: replaceSessionMessages(this.snapshot.messagesBySession, options.sessionKey, messages),
    };
    this.emit();
    return messages;
  }

  async sendMessage(input: QclawSendMessageInput): Promise<{ runId: string }> {
    const runId = globalThis.crypto.randomUUID();
    await this.request("chat.send", {
      sessionKey: input.sessionKey,
      message: input.message,
      ...(input.thinking ? { thinking: input.thinking } : {}),
      ...(input.attachments?.length ? { attachments: input.attachments } : {}),
      ...(input.timeoutMs != null ? { timeoutMs: input.timeoutMs } : {}),
      idempotencyKey: runId,
    });
    return { runId };
  }

  async abortRun(sessionKey: string, runId: string) {
    return await this.request("chat.abort", {
      sessionKey,
      runId,
    });
  }

  private async request(method: string, params?: unknown): Promise<unknown> {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      throw new Error("gateway not connected");
    }

    const id = globalThis.crypto.randomUUID();
    const promise = new Promise<unknown>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });

    this.socket.send(
      JSON.stringify({
        type: "req",
        id,
        method,
        params,
      }),
    );

    return promise;
  }

  private handleMessage(raw: string) {
    const frame: unknown = JSON.parse(raw);
    if (isGatewayEventFrame(frame)) {
      if (frame.event === "connect.challenge") {
        const nonce = readNonce(frame.payload);
        this.sendConnect(nonce);
        return;
      }
      if (frame.event === "chat" && frame.payload) {
        const events = normalizeOpenclawWsPayload(frame.payload as OpenclawWsBroadcastPayload);
        this.applyEvents(events);
        return;
      }
      if (frame.event === "tick") {
        if (this.snapshot.status !== "connected") {
          this.setSnapshot({ status: "connected" });
        }
      }
      return;
    }

    if (isGatewayResponseFrame(frame)) {
      const pending = this.pending.get(frame.id);
      if (!pending) {
        return;
      }
      this.pending.delete(frame.id);
      if (frame.ok) {
        pending.resolve(frame.payload);
      } else {
        const error = frame.error?.message ?? "unknown gateway error";
        this.setSnapshot({ status: "error", lastError: error });
        pending.reject(new Error(error));
      }
    }
  }

  private sendConnect(nonce: string) {
    void this.request("connect", {
      minProtocol: PROTOCOL_VERSION,
      maxProtocol: PROTOCOL_VERSION,
      client: {
        id: "webchat-ui",
        displayName: this.options.clientDisplayName ?? "qclaw-ui-playground",
        version: "0.1.0",
        platform: this.options.platform ?? "web",
        mode: "webchat",
        instanceId: globalThis.crypto.randomUUID(),
      },
      caps: ["tool-events"],
      auth:
        this.options.token || this.options.password
          ? {
              ...(this.options.token ? { token: this.options.token } : {}),
              ...(this.options.password ? { password: this.options.password } : {}),
            }
          : undefined,
      role: "operator",
      scopes: ["operator.admin"],
      locale: "zh-CN",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "qclaw-ui",
      // 浏览器 playground 不做设备签名，只走 token/password 或本地开放模式。
      _nonce: nonce,
    }).then(() => {
      this.reconnectAttempt = 0;
      this.setSnapshot({ status: "connected" }, { clearLastError: true });
    }).catch((error) => {
      this.setSnapshot({ status: "error", lastError: error instanceof Error ? error.message : String(error) });
    });
  }

  private applyEvents(events: QclawEvent[]) {
    let next = this.snapshot;
    for (const event of events) {
      next = {
        ...next,
        runsBySession: applyRunEvent(next.runsBySession, event),
        messagesBySession:
          event.kind === "message-upsert"
            ? upsertSessionMessage(next.messagesBySession, event.sessionKey, {
                messageId: event.payload.messageId,
                role: event.payload.role,
                sessionKey: event.sessionKey,
                runId: event.runId,
                content: event.payload.content,
                ...(event.payload.meta ? { meta: event.payload.meta } : {}),
              })
            : next.messagesBySession,
      };
    }
    this.snapshot = next;
    this.emit();
  }

  private scheduleReconnect() {
    this.reconnectAttempt += 1;
    const delay = nextReconnectDelay(this.reconnectAttempt);
    window.setTimeout(() => {
      if (!this.manualClose) {
        this.connect();
      }
    }, delay);
  }

  private rejectPending(error: Error) {
    for (const [, pending] of this.pending) {
      pending.reject(error);
    }
    this.pending.clear();
  }

  private setSnapshot(patch: Partial<QclawClientSnapshot>, options?: { clearLastError?: boolean }) {
    const next: QclawClientSnapshot = {
      ...this.snapshot,
      ...patch,
    };
    if (options?.clearLastError) {
      delete next.lastError;
    }
    this.snapshot = next;
    this.emit();
  }

  private emit() {
    for (const listener of this.listeners) {
      listener(this.snapshot);
    }
  }
}

function readNonce(payload: unknown): string {
  const nonce =
    payload && typeof payload === "object" && typeof (payload as { nonce?: unknown }).nonce === "string"
      ? (payload as { nonce: string }).nonce
      : "";
  return nonce;
}

function isGatewayEventFrame(value: unknown): value is GatewayEventFrame {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "event" &&
    typeof (value as { event?: unknown }).event === "string"
  );
}

function isGatewayResponseFrame(value: unknown): value is GatewayResponseFrame {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    (value as { type?: unknown }).type === "res" &&
    typeof (value as { id?: unknown }).id === "string" &&
    typeof (value as { ok?: unknown }).ok === "boolean"
  );
}