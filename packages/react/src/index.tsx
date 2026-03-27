import type {
  ActivityPayload,
  FinalMetaPayload,
  MessageContentBlock,
  QclawMessage,
  QclawRunState,
  StepProgressPayload,
  ToolStatusPayload,
} from "@qclaw-ui/protocol";
import React from "react";

export type QclawExecutionPanelProps = {
  run: QclawRunState;
  defaultOpen?: boolean;
  title?: string;
};

export type QclawMessageCardProps = {
  message: QclawMessage;
  feedback?: "up" | "down" | null;
  onFeedbackChange?: (next: "up" | "down") => void;
};

export function QclawExecutionPanel({
  run,
  defaultOpen = run.status === "running" || run.status === "error",
  title = "执行过程",
}: QclawExecutionPanelProps) {
  const timeline = buildTimelineItems(run);

  return (
    <section style={executionPanelStyle}>
      <details open={defaultOpen}>
        <summary style={summaryStyle}>
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <strong>{title}</strong>
            <StatusPill status={run.status} />
          </span>
          <span style={metaHintStyle}>runId: {run.runId}</span>
        </summary>

        <div style={{ display: "grid", gap: 16, marginTop: 14 }}>
          {timeline.length === 0 ? <div style={metaHintStyle}>当前 run 还没有可展示的执行事件。</div> : null}

          {timeline.length > 0 ? (
            <div style={timelineStyle}>
              {timeline.map((item) => (
                <section key={item.id} style={timelineItemStyle}>
                  <div style={timelineRailStyle}>
                    <span style={timelineDotStyle(item.kind, item.status)} />
                    <span style={timelineLineStyle} />
                  </div>

                  <div style={timelineCardStyle}>
                    <div style={timelineHeaderStyle}>
                      <div style={{ display: "grid", gap: 4 }}>
                        <div style={inlineMetaStyle}>
                          <span style={timelineKindBadgeStyle(item.kind)}>{item.kindLabel}</span>
                          <strong>{item.label}</strong>
                        </div>
                        {item.hint ? <div style={metaHintStyle}>{item.hint}</div> : null}
                      </div>

                      <div style={inlineMetaStyle}>
                        <StatusPill status={item.status} />
                        {formatDuration(item.durationMs)}
                      </div>
                    </div>

                    {item.kind === "thinking" && item.text ? <pre style={thinkingTextStyle}>{item.text}</pre> : null}
                    {item.kind === "final" && item.text ? <div style={finalTextStyle}>{item.text}</div> : null}
                    {item.kind === "activity" && item.detail ? <ActivityDetail detail={item.detail} /> : null}
                    {item.kind === "final" && item.meta ? (
                      <div style={{ marginTop: 10 }}>
                        <MessageMetaBar meta={item.meta} feedback={null} onFeedbackChange={undefined} />
                      </div>
                    ) : null}
                  </div>
                </section>
              ))}
            </div>
          ) : null}
        </div>
      </details>
    </section>
  );
}

export function QclawMessageCard({ message, feedback = null, onFeedbackChange }: QclawMessageCardProps) {
  return (
    <article style={messageCardStyle}>
      <div style={messageHeaderStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <RoleBadge role={message.role} />
          <span style={metaHintStyle}>{message.messageId}</span>
        </div>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        {message.content.map((block, index) => (
          <React.Fragment key={`${message.messageId}:${index}`}>{renderBlock(block)}</React.Fragment>
        ))}
      </div>

      <MessageMetaBar meta={message.meta} feedback={feedback} onFeedbackChange={onFeedbackChange} />
    </article>
  );
}

function ActivityDetail({ detail }: { detail: NonNullable<ActivityPayload["detail"]> }) {
  return (
    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
      {detail.model ? <div style={metaHintStyle}>model: {detail.model}</div> : null}
      {detail.input ? (
        <div>
          <div style={detailLabelStyle}>input</div>
          <pre style={detailTextStyle}>{detail.input}</pre>
        </div>
      ) : null}
      {detail.streamingText ? (
        <div>
          <div style={detailLabelStyle}>streaming</div>
          <pre style={detailTextStyle}>{detail.streamingText}</pre>
        </div>
      ) : null}
      {detail.output ? (
        <div>
          <div style={detailLabelStyle}>output</div>
          <pre style={detailTextStyle}>{detail.output}</pre>
        </div>
      ) : null}
      {detail.error ? (
        <div>
          <div style={detailLabelStyle}>error</div>
          <pre style={{ ...detailTextStyle, color: "#b91c1c" }}>{detail.error}</pre>
        </div>
      ) : null}
    </div>
  );
}

function MessageMetaBar({
  meta,
  feedback,
  onFeedbackChange,
}: {
  meta: FinalMetaPayload | undefined;
  feedback: "up" | "down" | null;
  onFeedbackChange: ((next: "up" | "down") => void) | undefined;
}) {
  const usageText = formatUsage(meta?.usage);

  if (!meta && !onFeedbackChange) {
    return null;
  }

  return (
    <div style={metaBarStyle}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {meta?.timestamp ? <span>{new Date(meta.timestamp).toLocaleString()}</span> : null}
        {meta?.model ? <span>模型：{meta.model}</span> : null}
        {meta?.provider ? <span>Provider：{meta.provider}</span> : null}
        {usageText ? <span>统计：{usageText}</span> : null}
      </div>

      {onFeedbackChange ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span>反馈</span>
          <button type="button" onClick={() => onFeedbackChange("up")} style={feedbackButtonStyle(feedback === "up")}>
            👍
          </button>
          <button type="button" onClick={() => onFeedbackChange("down")} style={feedbackButtonStyle(feedback === "down")}>
            👎
          </button>
        </div>
      ) : null}
    </div>
  );
}

function RoleBadge({ role }: { role: QclawMessage["role"] }) {
  const label = role === "assistant" ? "AI" : role === "user" ? "USER" : "SYSTEM";
  return <span style={roleBadgeStyle(role)}>{label}</span>;
}

function StatusPill({
  status,
}: {
  status: QclawRunState["status"] | ToolStatusPayload["status"] | StepProgressPayload["status"] | ActivityPayload["status"];
}) {
  const normalized = status === "idle" ? "pending" : status;
  return <span style={statusPillStyle(status)}>{normalized}</span>;
}

function renderBlock(block: MessageContentBlock) {
  switch (block.type) {
    case "text":
      return <div style={textBlockStyle}>{block.text}</div>;
    case "thinking":
      return (
        <details style={thinkingCardStyle}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Thinking</summary>
          <pre style={thinkingTextStyle}>{block.text}</pre>
        </details>
      );
    case "image":
      return (
        <div style={mediaCardStyle}>
          <img src={block.url} alt="assistant generated" style={imageStyle} />
        </div>
      );
    case "audio":
      return (
        <div style={mediaCardStyle}>
          <div style={sectionTitleStyle}>Audio</div>
          <audio controls preload="metadata" style={{ width: "100%" }}>
            <source src={block.url} />
          </audio>
        </div>
      );
    case "video":
      return (
        <div style={mediaCardStyle}>
          <div style={sectionTitleStyle}>Video</div>
          <video controls preload="metadata" style={videoStyle}>
            <source src={block.url} />
          </video>
        </div>
      );
    case "file":
      return (
        <div style={mediaCardStyle}>
          <div style={sectionTitleStyle}>File</div>
          <a href={block.url} target="_blank" rel="noreferrer" style={fileLinkStyle}>
            下载附件
          </a>
        </div>
      );
    default:
      return null;
  }
}

function formatDuration(durationMs?: number) {
  return durationMs ? `${durationMs}ms` : null;
}

function formatUsage(usage: unknown) {
  if (!usage || typeof usage !== "object") {
    return null;
  }

  return Object.entries(usage)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ");
}

function compareSteps(left: StepProgressPayload, right: StepProgressPayload) {
  return left.stepIndex - right.stepIndex;
}

function compareActivities(left: ActivityPayload, right: ActivityPayload) {
  const leftIndex = left.stepIndex ?? Number.MAX_SAFE_INTEGER;
  const rightIndex = right.stepIndex ?? Number.MAX_SAFE_INTEGER;
  if (leftIndex !== rightIndex) {
    return leftIndex - rightIndex;
  }
  return left.label.localeCompare(right.label);
}

type TimelineKind = "thinking" | "step" | "tool" | "activity" | "final";

type TimelineItem = {
  id: string;
  kind: TimelineKind;
  kindLabel: string;
  label: string;
  status: QclawRunState["status"] | ToolStatusPayload["status"] | StepProgressPayload["status"] | ActivityPayload["status"];
  order: number;
  durationMs?: number;
  hint?: string;
  text?: string;
  detail?: NonNullable<ActivityPayload["detail"]>;
  meta?: FinalMetaPayload;
};

function buildTimelineItems(run: QclawRunState): TimelineItem[] {
  const items: TimelineItem[] = [];
  const steps = Object.values(run.steps).sort(compareSteps);
  const tools = Object.values(run.tools).sort(compareTools);
  const activities = Object.values(run.activities).sort(compareActivities);

  if (run.thinking) {
    items.push({
      id: `${run.runId}:thinking`,
      kind: "thinking",
      kindLabel: "Thinking",
      label: "模型思考",
      status: run.status === "error" ? "error" : run.status === "aborted" ? "aborted" : "running",
      order: 10,
      text: run.thinking,
      hint: "实时累计的 reasoning 文本。",
    });
  }

  for (const step of steps) {
    items.push({
      id: `${run.runId}:step:${step.stepIndex}:${step.label}`,
      kind: "step",
      kindLabel: "Step",
      label: step.label,
      status: step.status,
      order: 100 + step.stepIndex,
      hint: formatStepHint(step),
    });
  }

  for (const tool of tools) {
    items.push({
      id: `${run.runId}:tool:${tool.toolCallId}`,
      kind: "tool",
      kindLabel: "Tool",
      label: `${tool.emoji ? `${tool.emoji} ` : ""}${tool.label}`,
      status: tool.status,
      order: 300,
      hint: tool.verb ? `${tool.name} · ${tool.verb}` : tool.name,
      ...(tool.durationMs != null ? { durationMs: tool.durationMs } : {}),
    });
  }

  for (const activity of activities) {
    items.push({
      id: `${run.runId}:activity:${activity.activityId}`,
      kind: "activity",
      kindLabel: "Activity",
      label: activity.label,
      status: activity.status,
      order: 400 + (activity.stepIndex ?? 0),
      hint: activity.activityType,
      ...(activity.durationMs != null ? { durationMs: activity.durationMs } : {}),
      ...(activity.detail ? { detail: activity.detail } : {}),
    });
  }

  if (run.text || run.meta || run.status === "final" || run.status === "error" || run.status === "aborted") {
    items.push({
      id: `${run.runId}:final`,
      kind: "final",
      kindLabel: "Final",
      label: run.status === "error" ? "执行失败" : run.status === "aborted" ? "执行中断" : "最终回复",
      status: run.status,
      order: 900,
      ...(run.text ? { text: run.text } : {}),
      ...(run.meta ? { meta: run.meta } : {}),
      ...(run.status === "final" ? { hint: "最终输出已落盘到消息历史。" } : {}),
    });
  }

  return items.sort((left, right) => left.order - right.order || left.label.localeCompare(right.label));
}

function compareTools(left: ToolStatusPayload, right: ToolStatusPayload) {
  return left.label.localeCompare(right.label);
}

function formatStepHint(step: StepProgressPayload) {
  const parts = [`Step ${step.stepIndex + 1}`];
  if (step.stepTotal) {
    parts.push(`共 ${step.stepTotal} 步`);
  }
  if (step.parallelGroup) {
    parts.push(`并行组 ${step.parallelGroup}`);
  }
  if (step.isParallel) {
    parts.push("并行执行");
  }
  return parts.join(" · ");
}

const executionPanelStyle: React.CSSProperties = {
  border: "1px solid var(--qclaw-border, #d6dbe5)",
  borderRadius: 18,
  padding: 16,
  background: "var(--qclaw-panel, #ffffff)",
  boxShadow: "0 12px 32px rgba(15, 23, 42, 0.06)",
};

const subPanelStyle: React.CSSProperties = {
  border: "1px solid #e6e9ef",
  borderRadius: 14,
  padding: 12,
  background: "#fafcff",
};

const timelineStyle: React.CSSProperties = {
  display: "grid",
  gap: 12,
};

const timelineItemStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "18px 1fr",
  gap: 12,
  alignItems: "stretch",
};

const timelineRailStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateRows: "16px 1fr",
  justifyItems: "center",
};

const timelineLineStyle: React.CSSProperties = {
  width: 2,
  background: "#dbe4f0",
  minHeight: 24,
  borderRadius: 999,
};

const timelineCardStyle: React.CSSProperties = {
  border: "1px solid #e6e9ef",
  borderRadius: 14,
  padding: 12,
  background: "#fcfdff",
  display: "grid",
  gap: 10,
};

const timelineHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 12,
  flexWrap: "wrap",
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: 10,
};

const rowStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const summaryStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "pointer",
  gap: 12,
  flexWrap: "wrap",
};

const sectionTitleStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  marginBottom: 8,
  color: "#334155",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const detailLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 700,
  color: "#64748b",
  marginBottom: 4,
  textTransform: "uppercase",
};

const detailTextStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontSize: 13,
  lineHeight: 1.6,
  background: "#f8fafc",
  borderRadius: 10,
  padding: 10,
};

const activityCardStyle: React.CSSProperties = {
  border: "1px solid #e6e9ef",
  borderRadius: 12,
  padding: 10,
  background: "#ffffff",
};

const activitySummaryStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  cursor: "pointer",
  flexWrap: "wrap",
};

const finalTextStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  lineHeight: 1.7,
};

const thinkingTextStyle: React.CSSProperties = {
  margin: 0,
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  fontFamily: "inherit",
  fontSize: 14,
  lineHeight: 1.7,
  color: "#334155",
};

const thinkingCardStyle: React.CSSProperties = {
  border: "1px dashed #cbd5e1",
  borderRadius: 12,
  padding: 12,
  background: "#f8fafc",
};

const messageCardStyle: React.CSSProperties = {
  border: "1px solid var(--qclaw-border, #d6dbe5)",
  borderRadius: 18,
  padding: 16,
  background: "var(--qclaw-panel, #ffffff)",
  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.06)",
  display: "grid",
  gap: 14,
};

const messageHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
};

const metaBarStyle: React.CSSProperties = {
  marginTop: 4,
  paddingTop: 12,
  borderTop: "1px solid #eef2f7",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
  color: "var(--qclaw-muted, #64748b)",
  fontSize: 12,
};

const metaHintStyle: React.CSSProperties = {
  color: "var(--qclaw-muted, #64748b)",
  fontSize: 12,
};

const textBlockStyle: React.CSSProperties = {
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  lineHeight: 1.75,
  color: "#0f172a",
};

const mediaCardStyle: React.CSSProperties = {
  border: "1px solid #e6e9ef",
  borderRadius: 16,
  padding: 12,
  background: "#f8fafc",
  display: "grid",
  gap: 8,
};

const imageStyle: React.CSSProperties = {
  width: "100%",
  display: "block",
  borderRadius: 14,
  objectFit: "cover",
};

const videoStyle: React.CSSProperties = {
  width: "100%",
  borderRadius: 14,
  background: "#000000",
};

const inlineMetaStyle: React.CSSProperties = {
  display: "inline-flex",
  gap: 8,
  alignItems: "center",
};

const fileLinkStyle: React.CSSProperties = {
  color: "#2563eb",
  textDecoration: "none",
  fontWeight: 600,
};

function roleBadgeStyle(role: QclawMessage["role"]): React.CSSProperties {
  const palette =
    role === "assistant"
      ? { background: "#dbeafe", color: "#1d4ed8" }
      : role === "user"
        ? { background: "#dcfce7", color: "#15803d" }
        : { background: "#ede9fe", color: "#6d28d9" };

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    letterSpacing: "0.04em",
    ...palette,
  };
}

function statusPillStyle(
  status: QclawRunState["status"] | ToolStatusPayload["status"] | StepProgressPayload["status"] | ActivityPayload["status"],
): React.CSSProperties {
  const palette =
    status === "done" || status === "final"
      ? { background: "#dcfce7", color: "#166534" }
      : status === "error"
        ? { background: "#fee2e2", color: "#b91c1c" }
        : status === "aborted"
          ? { background: "#fef3c7", color: "#b45309" }
          : status === "idle"
            ? { background: "#e2e8f0", color: "#475569" }
            : { background: "#dbeafe", color: "#1d4ed8" };

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "capitalize",
    ...palette,
  };
}

function feedbackButtonStyle(active: boolean): React.CSSProperties {
  return {
    border: active ? "1px solid #2563eb" : "1px solid #d6dbe5",
    background: active ? "#eff6ff" : "#ffffff",
    borderRadius: 10,
    padding: "4px 10px",
    cursor: "pointer",
  };
}

function timelineKindBadgeStyle(kind: TimelineKind): React.CSSProperties {
  const palette =
    kind === "thinking"
      ? { background: "#ede9fe", color: "#6d28d9" }
      : kind === "step"
        ? { background: "#dbeafe", color: "#1d4ed8" }
        : kind === "tool"
          ? { background: "#dcfce7", color: "#15803d" }
          : kind === "activity"
            ? { background: "#fef3c7", color: "#b45309" }
            : { background: "#fee2e2", color: "#b91c1c" };

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "3px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    ...palette,
  };
}

function timelineDotStyle(
  kind: TimelineKind,
  status: QclawRunState["status"] | ToolStatusPayload["status"] | StepProgressPayload["status"] | ActivityPayload["status"],
): React.CSSProperties {
  const background =
    status === "error"
      ? "#ef4444"
      : status === "aborted"
        ? "#f59e0b"
        : status === "done" || status === "final"
          ? "#22c55e"
          : kind === "thinking"
            ? "#8b5cf6"
            : kind === "tool"
              ? "#16a34a"
              : kind === "activity"
                ? "#f59e0b"
                : "#2563eb";

  return {
    width: 12,
    height: 12,
    borderRadius: 999,
    background,
    marginTop: 2,
    boxShadow: "0 0 0 3px #ffffff",
  };
}
