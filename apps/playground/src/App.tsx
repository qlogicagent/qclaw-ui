import { QclawGatewayClient } from "@qclaw-ui/client";
import type { QclawClientSnapshot } from "@qclaw-ui/client";
import type { QclawAttachmentInput, QclawMessage, QclawRunState } from "@qclaw-ui/protocol";
import { QclawExecutionPanel, QclawMessageCard } from "@qclaw-ui/react";
import { openclawThemeCss } from "@qclaw-ui/theme-openclaw";
import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_WS_URL = "ws://127.0.0.1:18789";
const DEFAULT_SESSION_KEY = "main";

type ComposerAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;
  kind: "image" | "audio" | "video" | "file";
};

export function App() {
  const [wsUrl, setWsUrl] = useState(() => localStorage.getItem("qclaw.playground.wsUrl") ?? DEFAULT_WS_URL);
  const [token, setToken] = useState(() => localStorage.getItem("qclaw.playground.token") ?? "");
  const [sessionKey, setSessionKey] = useState(() => localStorage.getItem("qclaw.playground.sessionKey") ?? DEFAULT_SESSION_KEY);
  const [message, setMessage] = useState("");
  const [composerAttachments, setComposerAttachments] = useState<ComposerAttachment[]>([]);
  const [requestInFlight, setRequestInFlight] = useState(false);
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<QclawClientSnapshot>({
    status: "idle",
    activeSession: { activeSessionKey: null },
    messagesBySession: {},
    runsBySession: {},
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const client = useMemo(
    () =>
      new QclawGatewayClient({
        url: wsUrl,
        token: token || undefined,
      }),
    [token, wsUrl],
  );
  const sessionMessages = snapshot.messagesBySession[sessionKey] ?? [];
  const sessionRuns = Object.values(snapshot.runsBySession[sessionKey] ?? {});
  const activeRun = [...sessionRuns].reverse().find((entry) => entry.status === "running") ?? null;
  const linkedRunIds = new Set<string>();
  const pendingRuns = sessionRuns.filter((run) => !activeRun || run.runId !== activeRun.runId);
  const currentAbortRunId = activeRun?.runId ?? pendingRunId;
  const isConnected = snapshot.status === "connected";
  const isBusy = requestInFlight || Boolean(currentAbortRunId);
  const canSend = isConnected && !isBusy && (message.trim().length > 0 || composerAttachments.length > 0);

  useEffect(() => {
    if (!pendingRunId) {
      return;
    }
    const pendingRun = sessionRuns.find((run) => run.runId === pendingRunId);
    if (pendingRun && pendingRun.status !== "idle" && pendingRun.status !== "running") {
      setPendingRunId(null);
    }
  }, [pendingRunId, sessionRuns]);

  useEffect(() => {
    localStorage.setItem("qclaw.playground.wsUrl", wsUrl);
  }, [wsUrl]);

  useEffect(() => {
    localStorage.setItem("qclaw.playground.token", token);
  }, [token]);

  useEffect(() => {
    localStorage.setItem("qclaw.playground.sessionKey", sessionKey);
  }, [sessionKey]);

  useEffect(() => {
    const unsubscribe = client.subscribe(setSnapshot);
    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, [client]);

  const connect = async () => {
    client.connect();
    window.setTimeout(() => {
      void client.bindSession(sessionKey).catch(() => undefined);
    }, 800);
  };

  const loadHistory = async () => {
    await client.bindSession(sessionKey);
  };

  const send = async () => {
    if (!canSend) {
      return;
    }

    setRequestInFlight(true);
    try {
      const { runId } = await client.sendMessage({
        sessionKey,
        message,
        attachments: composerAttachments.map(toAttachmentInput),
      });
      setPendingRunId(runId);
      setMessage("");
      setComposerAttachments([]);
      void client.loadHistory({ sessionKey, limit: 200 }).catch(() => undefined);
    } finally {
      setRequestInFlight(false);
    }
  };

  const abort = async () => {
    if (!currentAbortRunId) {
      return;
    }
    await client.abortRun(sessionKey, currentAbortRunId);
    setPendingRunId(null);
  };

  const handleFilesSelected = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) {
      return;
    }
    const next = await Promise.all(Array.from(fileList).map(createComposerAttachment));
    setComposerAttachments((current) => [...current, ...next]);
  };

  const handleComposerPaste = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedFiles = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === "file")
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));

    if (pastedFiles.length === 0) {
      return;
    }

    event.preventDefault();
    void handleFilesSelected(toFileListLike(pastedFiles));
  };

  return (
    <main style={{ maxWidth: 860, margin: "40px auto", fontFamily: "Segoe UI, sans-serif" }}>
      <style>{openclawThemeCss}</style>
      <h1>qclaw-ui playground</h1>
      <p>当前 playground 已可直连本地 openclaw gateway，验证协议归一化与最小聊天联调。</p>

      <section style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        <label>
          Gateway WS URL
          <input value={wsUrl} onChange={(event) => setWsUrl(event.target.value)} style={inputStyle} />
        </label>
        <label>
          Token
          <input value={token} onChange={(event) => setToken(event.target.value)} style={inputStyle} />
        </label>
        <label>
          Session Key
          <input value={sessionKey} onChange={(event) => setSessionKey(event.target.value)} style={inputStyle} />
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={connect} disabled={snapshot.status === "connecting" || isConnected}>连接</button>
          <button onClick={loadHistory} disabled={!isConnected || requestInFlight}>绑定并加载历史</button>
          <button onClick={() => client.disconnect()} disabled={snapshot.status === "idle" || snapshot.status === "closed"}>断开</button>
        </div>
        <div>
          状态：<strong>{snapshot.status}</strong>
          {snapshot.lastError ? <span style={{ color: "crimson", marginLeft: 8 }}>{snapshot.lastError}</span> : null}
        </div>
      </section>

      <section style={{ display: "grid", gap: 12, marginBottom: 20 }}>
        <div style={composerToolbarStyle}>
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isBusy}>
            上传附件
          </button>
          <span style={{ color: "var(--qclaw-muted, #64748b)", fontSize: 12 }}>支持附件上传与粘贴图片</span>
          {currentAbortRunId ? (
            <button type="button" onClick={abort} style={dangerButtonStyle}>
              Abort Run
            </button>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => {
            void handleFilesSelected(event.target.files);
            event.currentTarget.value = "";
          }}
        />

        {composerAttachments.length > 0 ? (
          <div style={attachmentGridStyle}>
            {composerAttachments.map((attachment) => (
              <div key={attachment.id} style={attachmentCardStyle}>
                {attachment.kind === "image" ? (
                  <img src={attachment.dataUrl} alt={attachment.fileName} style={attachmentPreviewImageStyle} />
                ) : (
                  <div style={attachmentPlaceholderStyle}>{attachment.kind.toUpperCase()}</div>
                )}
                <div style={{ display: "grid", gap: 4 }}>
                  <strong style={{ fontSize: 13 }}>{attachment.fileName}</strong>
                  <span style={attachmentMetaStyle}>{attachment.mimeType}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setComposerAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                  style={ghostButtonStyle}
                >
                  移除
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          onPaste={handleComposerPaste}
          rows={4}
          placeholder="输入消息后发送到当前 session，或直接粘贴图片"
          disabled={!isConnected || isBusy}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={send} disabled={!canSend}>{requestInFlight ? "发送中..." : currentAbortRunId ? "运行中..." : "发送消息"}</button>
          {!isConnected ? <span style={attachmentMetaStyle}>需先连接 gateway 后才能发送</span> : null}
        </div>
      </section>

      {activeRun ? (
        <section style={{ marginTop: 24, display: "grid", gap: 12 }}>
          <h2 style={sectionHeadingStyle}>进行中的执行</h2>
          <QclawExecutionPanel run={activeRun} defaultOpen title="Live Run" />
        </section>
      ) : null}

      <section style={{ marginTop: 24 }}>
        <h2 style={sectionHeadingStyle}>会话时间线</h2>
        <div style={{ display: "grid", gap: 12 }}>
          {sessionMessages.length === 0 ? <div style={{ color: "var(--qclaw-muted)" }}>暂无消息</div> : null}
          {sessionMessages.map((entry) => {
            const linkedRun = resolveRunForMessage(entry, pendingRuns);
            if (linkedRun?.runId) {
              linkedRunIds.add(linkedRun.runId);
            }

            return (
              <section key={entry.messageId} style={timelineMessageStyle}>
                <QclawMessageCard message={entry} />
                {linkedRun ? <QclawExecutionPanel run={linkedRun} title="Run Timeline" /> : null}
              </section>
            );
          })}

          {pendingRuns
            .filter((run) => !linkedRunIds.has(run.runId))
            .map((run) => (
              <section key={run.runId} style={timelineMessageStyle}>
                <div style={orphanRunLabelStyle}>未关联到历史消息的执行</div>
                <QclawExecutionPanel run={run} title="Detached Run" />
              </section>
            ))}
        </div>
      </section>
    </main>
  );
}

function resolveRunForMessage(message: QclawMessage, runs: QclawRunState[]) {
  if (message.role !== "assistant") {
    return null;
  }

  if (message.runId) {
    return runs.find((run) => run.runId === message.runId) ?? null;
  }

  return null;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  boxSizing: "border-box",
};

const timelineMessageStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const sectionHeadingStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 20,
};

const orphanRunLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "var(--qclaw-muted, #64748b)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const composerToolbarStyle: React.CSSProperties = {
  display: "flex",
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
};

const attachmentGridStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const attachmentCardStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "72px 1fr auto",
  gap: 12,
  alignItems: "center",
  border: "1px solid #dbe4f0",
  borderRadius: 14,
  padding: 10,
  background: "#f8fbff",
};

const attachmentPreviewImageStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 10,
  objectFit: "cover",
  display: "block",
};

const attachmentPlaceholderStyle: React.CSSProperties = {
  width: 72,
  height: 72,
  borderRadius: 10,
  display: "grid",
  placeItems: "center",
  background: "#e2e8f0",
  color: "#334155",
  fontSize: 12,
  fontWeight: 700,
};

const attachmentMetaStyle: React.CSSProperties = {
  color: "var(--qclaw-muted, #64748b)",
  fontSize: 12,
};

const ghostButtonStyle: React.CSSProperties = {
  border: "1px solid #d6dbe5",
  borderRadius: 10,
  background: "#ffffff",
  padding: "6px 10px",
  cursor: "pointer",
};

const dangerButtonStyle: React.CSSProperties = {
  border: "1px solid #fecaca",
  borderRadius: 10,
  background: "#fef2f2",
  color: "#b91c1c",
  padding: "6px 10px",
  cursor: "pointer",
};

function toAttachmentInput(attachment: ComposerAttachment): QclawAttachmentInput {
  return {
    type: attachment.kind,
    mimeType: attachment.mimeType,
    fileName: attachment.fileName,
    content: stripDataUrlPrefix(attachment.dataUrl),
  };
}

async function createComposerAttachment(file: File): Promise<ComposerAttachment> {
  const dataUrl = await readFileAsDataUrl(file);
  const mimeType = file.type || "application/octet-stream";
  return {
    id: `${file.name}:${file.lastModified}:${Math.random().toString(36).slice(2, 8)}`,
    fileName: file.name || "attachment",
    mimeType,
    dataUrl,
    kind: resolveAttachmentKind(mimeType),
  };
}

function resolveAttachmentKind(mimeType: string): ComposerAttachment["kind"] {
  if (mimeType.startsWith("image/")) {
    return "image";
  }
  if (mimeType.startsWith("audio/")) {
    return "audio";
  }
  if (mimeType.startsWith("video/")) {
    return "video";
  }
  return "file";
}

function stripDataUrlPrefix(dataUrl: string): string {
  const match = /^data:[^;]+;base64,(.+)$/i.exec(dataUrl);
  return match?.[1] ?? dataUrl;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("failed to read file as data url"));
    };
    reader.onerror = () => reject(reader.error ?? new Error("failed to read file"));
    reader.readAsDataURL(file);
  });
}

function toFileListLike(files: File[]): FileList {
  const transfer = new DataTransfer();
  for (const file of files) {
    transfer.items.add(file);
  }
  return transfer.files;
}