import type { MessageContentBlock, QclawMessage, QclawRunState } from "@qclaw-ui/protocol";
import { QclawExecutionPanel, QclawMessageCard } from "@qclaw-ui/react";
import { openclawThemeCss } from "@qclaw-ui/theme-openclaw";
import React, { useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";

const AUDIO_SAMPLE_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";
const VIDEO_SAMPLE_URL = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";
const DEFAULT_SESSION_KEY = "demo-session";

type DemoResponse = {
  text: string;
  media: MessageContentBlock[];
  model: string;
  provider: string;
  thinkingStart: string;
  thinkingEnd: string;
};

function DocsApp() {
  const [sessionKey] = useState(DEFAULT_SESSION_KEY);
  const [composer, setComposer] = useState("");
  const [messages, setMessages] = useState<QclawMessage[]>(() => createInitialMessages());
  const [activeRun, setActiveRun] = useState<QclawRunState | null>(null);
  const [feedbackByMessage, setFeedbackByMessage] = useState<Record<string, "up" | "down">>({});
  const timersRef = useRef<number[]>([]);
  const isBusy = activeRun?.status === "running";

  useEffect(() => {
    return () => {
      clearTimers(timersRef.current);
    };
  }, []);

  const quickPrompts = useMemo(
    () => [
      "帮我总结一下 qclaw-ui 的定位",
      "给我展示图片和文件效果",
      "演示一下音频和视频消息",
      "我想看一个包含全部附件的 AI 回复",
    ],
    [],
  );

  const sendMessage = () => {
    const prompt = composer.trim();
    if (!prompt || isBusy) {
      return;
    }

    clearTimers(timersRef.current);
    timersRef.current = [];

    const userMessage = createMessage({
      role: "user",
      sessionKey,
      content: [{ type: "text", text: prompt }],
      meta: createMeta({ model: "human-input", provider: "local-demo", usage: { chars: prompt.length } }),
    });
    const response = buildDemoResponse(prompt);
    const runId = createId("run");

    setMessages((current) => [...current, userMessage]);
    setComposer("");
    setActiveRun(createRunningRunState(runId, sessionKey, prompt, response.thinkingStart));

    timersRef.current.push(
      window.setTimeout(() => {
        setActiveRun((current) => {
          if (!current || current.runId !== runId) {
            return current;
          }

          return {
            ...current,
            thinking: `${current.thinking}\n${response.thinkingEnd}`,
            tools: {
              ...current.tools,
              "tool-media": {
                toolCallId: "tool-media",
                name: "media-composer",
                label: "素材整理",
                emoji: "🧩",
                status: "running",
              },
            },
            steps: {
              ...current.steps,
              "1:理解需求": {
                stepIndex: 1,
                stepTotal: 3,
                label: "理解需求",
                status: "done",
                isComplete: true,
              },
              "2:组织内容": {
                stepIndex: 2,
                stepTotal: 3,
                label: "组织内容",
                status: "running",
              },
            },
            activities: {
              ...current.activities,
              "activity-prepare": {
                activityId: "activity-prepare",
                activityType: "step",
                label: "生成回复草稿",
                status: "running",
                stepIndex: 2,
                stepTotal: 3,
                detail: {
                  input: prompt,
                  output: "正在拼装最终回答与多媒体块。",
                },
              },
            },
          };
        });
      }, 800),
    );

    timersRef.current.push(
      window.setTimeout(() => {
        const finalMeta = createMeta({
          model: response.model,
          provider: response.provider,
          usage: {
            inputChars: prompt.length,
            outputChars: response.text.length,
            mediaBlocks: response.media.length,
          },
        });
        const assistantMessage = createMessage({
          role: "assistant",
          sessionKey,
          content: [{ type: "text", text: response.text }, ...response.media],
          meta: finalMeta,
          runId,
        });

        setMessages((current) => [...current, assistantMessage]);
        setActiveRun((current) => {
          if (!current || current.runId !== runId) {
            return current;
          }

          return {
            ...current,
            text: response.text,
            status: "final",
            meta: finalMeta,
            tools: {
              ...current.tools,
              "tool-search": {
                toolCallId: "tool-search",
                name: "workspace-scan",
                label: "内容检索",
                emoji: "🔎",
                status: "done",
                durationMs: 420,
              },
              "tool-media": {
                toolCallId: "tool-media",
                name: "media-composer",
                label: "素材整理",
                emoji: "🧩",
                status: "done",
                durationMs: 710,
              },
            },
            steps: {
              ...current.steps,
              "1:理解需求": {
                stepIndex: 1,
                stepTotal: 3,
                label: "理解需求",
                status: "done",
                isComplete: true,
              },
              "2:组织内容": {
                stepIndex: 2,
                stepTotal: 3,
                label: "组织内容",
                status: "done",
                isComplete: true,
              },
              "3:生成结果": {
                stepIndex: 3,
                stepTotal: 3,
                label: "生成结果",
                status: "done",
                isComplete: true,
              },
            },
            activities: {
              ...current.activities,
              "activity-prepare": {
                activityId: "activity-prepare",
                activityType: "step",
                label: "生成回复草稿",
                status: "done",
                durationMs: 520,
                stepIndex: 2,
                stepTotal: 3,
                detail: {
                  input: prompt,
                  output: "草稿、媒体块与元信息已经组装完成。",
                },
              },
              "activity-final": {
                activityId: "activity-final",
                activityType: "sub-agent",
                label: "输出最终消息",
                status: "done",
                durationMs: 930,
                stepIndex: 3,
                stepTotal: 3,
                detail: {
                  model: response.model,
                  output: response.text,
                },
              },
            },
          };
        });
      }, 1700),
    );
  };

  return (
    <main style={pageStyle}>
      <style>{openclawThemeCss}</style>
      <section style={heroStyle}>
        <div style={{ display: "grid", gap: 12 }}>
          <span style={heroBadgeStyle}>qclaw-ui standalone demo</span>
          <h1 style={heroTitleStyle}>独立聊天演示页</h1>
          <p style={heroDescStyle}>
            这是一个不依赖网关的 mock 页面，用来先确认 qclaw-ui 的单页聊天体验、执行过程折叠、模型信息、反馈模块，以及图片 / 音频 / 视频 / 文件呈现效果。
          </p>
        </div>
        <div style={heroInfoCardStyle}>
          <div>Session：{sessionKey}</div>
          <div>状态：{isBusy ? "AI 正在模拟回复中" : "可直接体验"}</div>
          <div>说明：音频 / 视频使用公开示例素材，离线时播放器仍会显示但可能无法加载内容。</div>
        </div>
      </section>

      <section style={workspaceStyle}>
        <aside style={sidebarStyle}>
          <div style={panelStyle}>
            <h2 style={sidebarTitleStyle}>快速体验</h2>
            <div style={chipListStyle}>
              {quickPrompts.map((prompt) => (
                <button key={prompt} type="button" style={chipStyle} onClick={() => setComposer(prompt)}>
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div style={panelStyle}>
            <h2 style={sidebarTitleStyle}>已覆盖能力</h2>
            <ul style={sidebarListStyle}>
              <li>单页连续聊天阅读</li>
              <li>执行过程折叠查看</li>
              <li>模型 / Provider / 统计信息</li>
              <li>消息反馈按钮</li>
              <li>图片、音频、视频、文件渲染</li>
            </ul>
          </div>
        </aside>

        <section style={chatColumnStyle}>
          {activeRun ? <QclawExecutionPanel run={activeRun} /> : null}

          <div style={messageListStyle}>
            {messages.map((message) => (
              <QclawMessageCard
                key={message.messageId}
                message={message}
                feedback={feedbackByMessage[message.messageId] ?? null}
                onFeedbackChange={
                  message.role === "assistant"
                    ? (next) => {
                        setFeedbackByMessage((current) => ({ ...current, [message.messageId]: next }));
                      }
                    : undefined
                }
              />
            ))}
          </div>

          <section style={composerPanelStyle}>
            <textarea
              value={composer}
              onChange={(event) => setComposer(event.target.value)}
              rows={4}
              placeholder="输入一条消息，比如：给我展示图片和文件效果"
              style={composerStyle}
            />
            <div style={composerFooterStyle}>
              <span style={{ color: "var(--qclaw-muted)" }}>
                发送后会模拟 thinking、step、tool、final 的完整过程。
              </span>
              <button type="button" onClick={sendMessage} disabled={!composer.trim() || isBusy} style={sendButtonStyle(!composer.trim() || isBusy)}>
                {isBusy ? "AI 回复中..." : "发送消息"}
              </button>
            </div>
          </section>
        </section>
      </section>
    </main>
  );
}

function createInitialMessages(): QclawMessage[] {
  return [
    createMessage({
      role: "assistant",
      sessionKey: DEFAULT_SESSION_KEY,
      content: [
        {
          type: "text",
          text:
            "欢迎来到 qclaw-ui 独立演示页。你可以直接让我演示图片、音频、视频、文件，或者先问一个普通问题感受单页连续聊天体验。",
        },
      ],
      meta: createMeta({
        model: "qclaw-ui-demo-1",
        provider: "mock-runtime",
        usage: { inputChars: 0, outputChars: 57, mediaBlocks: 0 },
      }),
    }),
  ];
}

function createRunningRunState(runId: string, sessionKey: string, prompt: string, thinkingStart: string): QclawRunState {
  return {
    runId,
    sessionKey,
    text: "",
    thinking: thinkingStart,
    tools: {
      "tool-search": {
        toolCallId: "tool-search",
        name: "workspace-scan",
        label: "内容检索",
        emoji: "🔎",
        status: "running",
      },
    },
    steps: {
      "1:理解需求": {
        stepIndex: 1,
        stepTotal: 3,
        label: "理解需求",
        status: "running",
      },
    },
    activities: {
      "activity-think": {
        activityId: "activity-think",
        activityType: "thinking",
        label: "分析用户请求",
        status: "running",
        stepIndex: 1,
        stepTotal: 3,
        detail: {
          input: prompt,
          streamingText: thinkingStart,
          model: "qclaw-ui-demo-1",
        },
      },
    },
    status: "running",
  };
}

function buildDemoResponse(prompt: string): DemoResponse {
  const normalized = prompt.toLowerCase();
  const wantsImage = normalized.includes("图") || normalized.includes("image");
  const wantsAudio = normalized.includes("音频") || normalized.includes("audio");
  const wantsVideo = normalized.includes("视频") || normalized.includes("video");
  const wantsFile = normalized.includes("文件") || normalized.includes("file");
  const wantsAll = normalized.includes("全部") || normalized.includes("all");

  const media: MessageContentBlock[] = [];

  if (wantsAll || wantsImage) {
    media.push({ type: "image", url: createSvgDataUrl("qclaw-ui image preview", "#0f172a", "#7c3aed") });
  }
  if (wantsAll || wantsAudio) {
    media.push({ type: "audio", url: AUDIO_SAMPLE_URL });
  }
  if (wantsAll || wantsVideo) {
    media.push({ type: "video", url: VIDEO_SAMPLE_URL });
  }
  if (wantsAll || wantsFile) {
    media.push({
      type: "file",
      url: createTextDataUrl("qclaw-ui-demo.txt", `Prompt: ${prompt}\n\nThis is a demo attachment generated by qclaw-ui standalone docs.`),
    });
  }

  const summary =
    media.length > 0
      ? `我已经按你的要求生成了 ${media.length} 个内容块，并保留在同一条回复卡片里，方便你确认单页聊天体验。`
      : "这是一次纯文本模拟回复，用来确认聊天卡片、元信息栏和反馈模块的布局是否符合预期。";

  return {
    text: `${summary}\n\n如果你确认这个方向没问题，下一步就可以把这套页面逐步替换进真实的 openclaw 会话流。`,
    media,
    model: media.length > 0 ? "qclaw-ui-demo-multimodal" : "qclaw-ui-demo-1",
    provider: "mock-runtime",
    thinkingStart: "正在理解你的请求，并判断需要展示哪些消息块与执行状态。",
    thinkingEnd: media.length > 0 ? "已检测到多媒体需求，接下来会把媒体块直接挂进本轮回复。" : "本轮只需生成文本消息，并保留元信息与反馈模块。",
  };
}

function createMeta({
  model,
  provider,
  usage,
}: {
  model: string;
  provider: string;
  usage: Record<string, number>;
}) {
  return {
    model,
    provider,
    usage,
    timestamp: Date.now(),
  };
}

function createMessage({
  role,
  sessionKey,
  content,
  meta,
  runId,
}: {
  role: QclawMessage["role"];
  sessionKey: string;
  content: MessageContentBlock[];
  meta: NonNullable<QclawMessage["meta"]>;
  runId?: string;
}): QclawMessage {
  return {
    messageId: createId("msg"),
    role,
    sessionKey,
    content,
    ...(runId ? { runId } : {}),
    meta,
  };
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createSvgDataUrl(title: string, darkColor: string, accentColor: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="720" viewBox="0 0 1200 720">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop stop-color="${darkColor}" offset="0%"/>
      <stop stop-color="${accentColor}" offset="100%"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="720" rx="36" fill="url(#g)"/>
  <circle cx="180" cy="140" r="72" fill="rgba(255,255,255,0.16)"/>
  <circle cx="1040" cy="540" r="112" fill="rgba(255,255,255,0.12)"/>
  <text x="96" y="320" fill="#ffffff" font-size="72" font-family="Segoe UI, Arial, sans-serif" font-weight="700">qclaw-ui demo image</text>
  <text x="96" y="392" fill="#e2e8f0" font-size="30" font-family="Segoe UI, Arial, sans-serif">${title}</text>
  </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function createTextDataUrl(fileName: string, text: string) {
  const payload = `${fileName}\n\n${text}`;
  return `data:text/plain;charset=UTF-8,${encodeURIComponent(payload)}`;
}

function clearTimers(timerIds: number[]) {
  for (const timerId of timerIds) {
    window.clearTimeout(timerId);
  }
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)",
  color: "#0f172a",
  padding: "32px 20px 48px",
  fontFamily: '"Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
  boxSizing: "border-box",
};

const heroStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto 24px",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.8fr) minmax(280px, 1fr)",
  gap: 20,
  alignItems: "stretch",
};

const heroBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  borderRadius: 999,
  padding: "6px 12px",
  background: "#dbeafe",
  color: "#1d4ed8",
  fontWeight: 700,
  fontSize: 12,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 40,
  lineHeight: 1.1,
};

const heroDescStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 16,
  lineHeight: 1.8,
  color: "#334155",
  maxWidth: 820,
};

const heroInfoCardStyle: React.CSSProperties = {
  border: "1px solid #dbe4f0",
  borderRadius: 20,
  padding: 18,
  background: "rgba(255,255,255,0.9)",
  display: "grid",
  gap: 10,
  fontSize: 14,
  lineHeight: 1.7,
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.06)",
};

const workspaceStyle: React.CSSProperties = {
  maxWidth: 1280,
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "320px minmax(0, 1fr)",
  gap: 20,
  alignItems: "start",
};

const sidebarStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
  position: "sticky",
  top: 20,
};

const panelStyle: React.CSSProperties = {
  border: "1px solid #dbe4f0",
  borderRadius: 18,
  padding: 16,
  background: "rgba(255,255,255,0.92)",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const sidebarTitleStyle: React.CSSProperties = {
  margin: "0 0 12px",
  fontSize: 18,
};

const sidebarListStyle: React.CSSProperties = {
  margin: 0,
  paddingLeft: 20,
  display: "grid",
  gap: 8,
  color: "#334155",
};

const chipListStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const chipStyle: React.CSSProperties = {
  border: "1px solid #dbe4f0",
  background: "#f8fbff",
  borderRadius: 14,
  padding: "10px 12px",
  textAlign: "left",
  cursor: "pointer",
  fontSize: 14,
};

const chatColumnStyle: React.CSSProperties = {
  display: "grid",
  gap: 18,
};

const messageListStyle: React.CSSProperties = {
  display: "grid",
  gap: 16,
};

const composerPanelStyle: React.CSSProperties = {
  border: "1px solid #dbe4f0",
  borderRadius: 20,
  padding: 16,
  background: "rgba(255,255,255,0.95)",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.05)",
};

const composerStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  border: "1px solid #d6dbe5",
  borderRadius: 16,
  padding: 14,
  font: "inherit",
  resize: "vertical",
  minHeight: 112,
};

const composerFooterStyle: React.CSSProperties = {
  marginTop: 12,
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap",
};

function sendButtonStyle(disabled: boolean): React.CSSProperties {
  return {
    border: "none",
    borderRadius: 14,
    padding: "10px 18px",
    background: disabled ? "#cbd5e1" : "#2563eb",
    color: "#ffffff",
    cursor: disabled ? "not-allowed" : "pointer",
    fontWeight: 700,
  };
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DocsApp />
  </React.StrictMode>,
);
