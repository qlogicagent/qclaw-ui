# qclaw-ui Protocol v1

Source baseline: `steup/new/qclaw-ui-协议草案-v1.md`.

## Goals

1. Keep qclaw-ui decoupled from openclaw internals.
2. Let openclaw be the first host with a thin adapter layer.
3. Make the same UI protocol reusable for future gateways.

v1 priorities:

- preserve the current openclaw single-page chat experience
- preserve inline media and bottom meta bar
- standardize collapsible execution playback
- standardize IM real-time refresh behavior

## Layers

1. Command layer: UI to host or gateway.
2. Event layer: gateway to UI.
3. Normalization layer: host protocol to qclaw-ui standard events.
4. State layer: reduce events into message, run, and active-session state.

## Standard Commands

### `chat.send`

- required: `sessionKey`, `message`, `idempotencyKey`
- optional: `thinking`, `attachments`, `timeoutMs`, `metadata`

### `chat.abort`

- required: `sessionKey`
- optional: `runId`
- semantics: abort the specified run, or the most recent active run for the session

### `chat.history`

- required: `sessionKey`
- optional: `limit`
- semantics: lightweight history load or revalidate

### `session.bind`

- required: `sessionKey`
- optional: `reason`
- semantics: switch active session, rebuild context, and trigger rebinding or history correction

## Standard Event Envelope

Required envelope fields:

- `runId`
- `sessionKey`
- `seq`
- `kind`

Optional envelope fields:

- `ts`
- `source`

Supported `kind` values in v1:

- `text-delta`
- `thinking-delta`
- `tool-status`
- `step-progress`
- `activity`
- `final`
- `error`
- `aborted`
- `message-upsert`
- `session-bound`

## Event Semantics

- `text-delta`: append assistant body text only.
- `thinking-delta`: append thinking buffer only.
- `tool-status`: upsert by `toolCallId`.
- `step-progress`: upsert by progress identity such as `stepIndex + label`.
- `activity`: upsert by `activityId` and preserve detailed execution trail.
- `final`: close the run and backfill meta bar fields.
- `error`: close the run in error state and preserve inspection context.
- `aborted`: close the run in aborted state and preserve partial output when available.
- `message-upsert`: patch message history and IM inbound content.
- `session-bound`: acknowledge active session binding or resume behavior.

## Normalization Rules

- Split mixed openclaw deltas into separate `thinking-delta` and `text-delta` events.
- Keep thinking text out of the assistant body buffer.
- Prefer `final.meta`, then history message meta, then empty meta.
- Render media from history or final message content blocks rather than defining media-specific delta events.

## State Reduction Rules

### Active Session

- only one active `sessionKey` at a time
- switch active session before reducing follow-up events
- route all event handling by `sessionKey`

### Message Store

- `message-upsert` patches messages directly
- `final` may solidify the active run into an assistant message
- history load may replace or patch a session message list

### Run Store

- text and thinking deltas append to separate buffers
- tool, step, and activity data are upserted incrementally
- `final`, `error`, and `aborted` end the run without losing playback state

## IM Refresh Contract

- switch session through `session.bind`
- resume host session when available
- load lightweight history for correction
- treat incremental events as the main refresh path
- avoid manual refresh as a normal user path once the view is bound to an IM session

## Compatibility Policy

- adapters may accept incomplete host schemas and ignore unknown fields
- missing critical known fields must degrade gracefully rather than crash the UI