# qclaw-ui x openclaw Minimal Integration v1

Source baseline: `steup/new/qclaw-ui×openclaw-最小接入实施清单-v1.md`.

## Scope

This path focuses on minimum viable integration between qclaw-ui and local openclaw or Electron. It does not require a gateway rewrite.

## Required Outcomes

1. Electron can load qclaw-ui as the main UI.
2. qclaw-ui can connect to the local openclaw gateway.
3. Existing chat essentials stay intact:
   - timestamp and meta bar
   - model and usage display
   - feedback module
   - inline image, video, audio, and file rendering
   - single-page conversation layout
4. Execution details become collapsible panels.
5. IM session switching refreshes automatically through incremental events.

## Out of Scope

- rewriting the openclaw gateway protocol
- redesigning the entire message card structure
- full execution replay for all historical sessions
- changing openclaw core reasoning, scheduling, or tool runtime

## Implementation Phases

### Phase A: UI shell

- create qclaw-ui workspace
- boot `apps/playground`
- render a static chat shell

### Phase B: basic chat

- integrate `chat.history`
- integrate `chat.send`
- integrate `delta`, `final`, `error`, and `aborted`
- get assistant body rendering correct first

### Phase C: preserve existing chat qualities

- restore bottom meta bar
- restore inline media blocks
- keep single-page layout

### Phase D: execution folding

- integrate `tool-status`
- integrate `step-progress`
- integrate `activity`
- build the execution panel

### Phase E: IM real-time refresh

- switch active `sessionKey` immediately on channel switch
- call session resume bridge when available
- treat incremental events as the primary refresh path
- use history revalidation only as a safety net

### Phase F: Electron entry switch

- support `uiMode`
- support configurable `uiUrl`
- retain a `legacy` fallback path

## File-Level Guidance

- Electron should own entry switching and bridge resume hooks.
- openclaw should expose enough event projection for tolerant adapter parsing.
- qclaw-ui should absorb host variance through the adapter layer and keep protocol contracts stable.