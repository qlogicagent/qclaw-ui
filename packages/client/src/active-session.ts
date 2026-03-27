import type { ActiveSessionState } from "@qclaw-ui/protocol";

export function createActiveSessionState(activeSessionKey: string | null = null): ActiveSessionState {
  return {
    activeSessionKey,
    ...(activeSessionKey ? { lastBoundAt: Date.now() } : {}),
  };
}

export function bindActiveSession(sessionKey: string): ActiveSessionState {
  return {
    activeSessionKey: sessionKey,
    lastBoundAt: Date.now(),
  };
}