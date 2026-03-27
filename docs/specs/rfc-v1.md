# qclaw-ui RFC v1

Source baseline: `steup/new/RFC-qclaw-ui-v1.md`.

## Product Positioning

qclaw-ui is a standard chat execution UI for agent or gateway hosts. It keeps the current openclaw chat page as the visual baseline while adding stronger execution playback and IM real-time refresh.

This is not a DeerFlow-style multi-page clone. The project keeps:

- single-page continuous chat reading
- inline image, video, audio, and file rendering
- bottom meta information such as timestamp, usage, model, provider, cost, and feedback
- foldable execution and thinking views rather than separate tabs or pages

## Architectural Direction

- qclaw-ui is an independent repository and release unit.
- The protocol comes first; host adapters come second.
- openclaw is the first host, not the only host.
- shared packages should remain reusable across future gateways.

## Design Goals

1. Independent engineering, versioning, and publishing.
2. Protocol-driven UI with minimal host coupling.
3. Minimal host integration cost for openclaw and Electron.
4. Stronger execution observability without breaking the current chat reading model.

## Core UX Constraints

- keep inline media inside the message card
- keep the message meta bar always visible
- keep execution and thinking panels collapsible
- do not move core context into secondary pages
- do not hide model, usage, or feedback data behind extra navigation

## Package Direction

- `@qclaw-ui/protocol`: stable types and contracts
- `@qclaw-ui/client`: event reduction, session binding, and history loading
- `@qclaw-ui/react`: reusable UI primitives and containers
- `@qclaw-ui/theme-openclaw`: visual baseline tokens
- `@qclaw-ui/adapter-openclaw`: host integration adapter for openclaw

## Non-Goals for v1

- no forced multi-page information architecture
- no full historical execution replay for every legacy session
- no rewrite of openclaw core inference, scheduling, or tool runtime
- no host-specific protocol pollution inside shared packages

## Commercial Split

- Core: Apache-2.0
- Pro: BSL-1.1 with Apache-2.0 conversion after three years
- Organization: `qlogicagent`