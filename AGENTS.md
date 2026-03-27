# AGENTS.md

This repository is a protocol-driven UI workspace. Treat it as an independent product, not a thin copy of openclaw pages.

## Mission

- Keep qclaw-ui host-agnostic at the protocol and React layers.
- Preserve the openclaw single-page chat experience where it matters: inline media, meta bar, continuous reading flow.
- Strengthen execution playback and IM real-time refresh without leaking host internals into shared packages.

## Repo Map

- `packages/protocol`: stable command, event, and session contracts. No React deps. No host-specific transport logic.
- `packages/adapter-openclaw`: openclaw transport and normalization only.
- `packages/client`: session binding, history loading, run/message stores, reconnection.
- `packages/react`: presentational and interaction components built on normalized state.
- `packages/theme-openclaw`: visual baseline tokens and theme glue.
- `apps/playground`: integration surface for local gateway debugging and parity checks.
- `docs/specs`: product, protocol, and implementation documents that define intended direction.

## Required Reading

Before non-trivial changes, read the specs that match your scope:

- `docs/specs/protocol-v1.md` for command/event/state changes.
- `docs/specs/rfc-v1.md` for product and architecture decisions.
- `docs/specs/openclaw-integration-v1.md` for host integration behavior.
- `docs/specs/repo-bootstrap-v1.md` for workspace structure and package responsibilities.

## Change Rules

- If you change protocol types, update protocol docs, adapter normalization, and any affected tests in the same change.
- Keep `sessionKey` and `runId` fidelity intact. History binding, abort targeting, and execution playback depend on them.
- Prefer widening at the adapter layer over leaking openclaw-specific fields into `packages/protocol`.
- Preserve strict TypeScript behavior. Do not paper over `exactOptionalPropertyTypes` or union narrowing with `any`.
- Keep UI changes aligned with the existing single-column chat flow unless the spec explicitly says otherwise.
- Do not move media, meta bar, or execution/timeline behavior into unrelated packages.
- Put experimental or host-specific behavior behind `apps/playground` or adapter code, not shared core APIs.

## Validation

- For protocol or store changes, run targeted builds for touched packages and the workspace build if the change crosses package boundaries.
- For adapter or history changes, verify normalization paths and any tests covering `chat.history`, streaming events, abort, and attachments.
- For playground behavior changes, verify the local user flow against a live gateway when practical.

## Documentation Sync

- Specs in `docs/specs` are part of the product contract. Keep them synchronized with real code decisions.
- When architecture or implementation direction changes, update the relevant spec in the same commit.