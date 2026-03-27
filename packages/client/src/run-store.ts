import type { QclawEvent, QclawRunState } from "@qclaw-ui/protocol";

export type RunStoreState = Record<string, Record<string, QclawRunState>>;

export function applyRunEvent(state: RunStoreState, event: QclawEvent): RunStoreState {
  if (event.kind === "message-upsert" || event.kind === "session-bound") {
    return state;
  }

  const sessionRuns = state[event.sessionKey] ?? {};
  const current =
    sessionRuns[event.runId] ??
    createRunState({
      runId: event.runId,
      sessionKey: event.sessionKey,
    });

  const next = reduceRun(current, event);
  return {
    ...state,
    [event.sessionKey]: {
      ...sessionRuns,
      [event.runId]: next,
    },
  };
}

export function createRunState(params: { runId: string; sessionKey: string }): QclawRunState {
  return {
    runId: params.runId,
    sessionKey: params.sessionKey,
    text: "",
    thinking: "",
    tools: {},
    steps: {},
    activities: {},
    status: "idle",
  };
}

function reduceRun(run: QclawRunState, event: QclawEvent): QclawRunState {
  switch (event.kind) {
    case "text-delta":
      return {
        ...run,
        text: `${run.text}${event.payload.text}`,
        status: "running",
      };
    case "thinking-delta":
      return {
        ...run,
        thinking: `${run.thinking}${event.payload.text}`,
        status: "running",
      };
    case "tool-status":
      return {
        ...run,
        status: "running",
        tools: {
          ...run.tools,
          [event.payload.toolCallId]: event.payload,
        },
      };
    case "step-progress":
      return {
        ...run,
        status: "running",
        steps: {
          ...run.steps,
          [`${event.payload.stepIndex}:${event.payload.label}`]: event.payload,
        },
      };
    case "activity":
      return {
        ...run,
        status: event.payload.status === "error" ? "error" : run.status === "idle" ? "running" : run.status,
        activities: {
          ...run.activities,
          [event.payload.activityId]: event.payload,
        },
      };
    case "final":
      return {
        ...run,
        status: "final",
        ...(event.payload.text ? { text: event.payload.text } : {}),
        ...(event.payload.meta ? { meta: event.payload.meta } : {}),
      };
    case "error":
      return {
        ...run,
        status: "error",
      };
    case "aborted":
      return {
        ...run,
        status: "aborted",
        ...(event.payload.partialText ? { text: event.payload.partialText } : {}),
      };
    default:
      return run;
  }
}