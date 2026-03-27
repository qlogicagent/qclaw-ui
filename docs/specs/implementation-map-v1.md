# qclaw-ui Implementation Map v1

Source baseline: `steup/new/PLAN-xiaozhiclaw-实施顺序清单-代码落点映射.md`.

## Purpose

This document keeps the execution order and code landing map that matter to qclaw-ui integration work, without copying unrelated desktop or infrastructure phases into day-to-day UI work.

## Recommended Order

1. Stabilize the qclaw-ui workspace and local playground.
2. Wire qclaw-ui to openclaw gateway history and send flows.
3. Restore current chat essentials such as meta bar and inline media.
4. Fold execution detail into structured playback panels.
5. Fix IM session switching and incremental refresh.
6. Finish Electron entry switching with rollback support.

## Primary Code Landing Zones

### qclaw-ui workspace

- `packages/protocol`: standard command and event contracts
- `packages/adapter-openclaw`: openclaw schema tolerance and normalization
- `packages/client`: active session, run store, message store, history loader, reconnection
- `packages/react`: assistant card, execution panel, thinking panel, message chrome
- `apps/playground`: host wiring, gateway URL handling, integration checks

### Electron host side

- `electron/src/main/index.ts`: resolve UI URL and switch between legacy UI and qclaw-ui
- `electron/src/shared/constants.ts`: centralize qclaw-ui dev or prod URLs and UI mode defaults
- `electron/src/main/ipc-handlers.ts`: preserve `bridge:session:resume` as the IM resume path

### openclaw gateway side

- gateway history and chat methods: keep `chat.history`, `chat.send`, and abort flows consistent
- event projection path: preserve `delta`, `final`, `error`, `aborted`, `tool-status`, `step-progress`, and `activity`
- schema gaps should be tolerated by the adapter before requesting host-side protocol changes

## Delivery Rules

- Favor adapter normalization first when host payloads are inconsistent.
- Only promote fields into shared protocol packages when they are part of the stable qclaw-ui contract.
- When landing a cross-repo change, keep qclaw-ui docs synchronized with the actual integration path.