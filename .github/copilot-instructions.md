# Copilot Instructions for qclaw-ui

qclaw-ui is a pnpm TypeScript monorepo for a protocol-driven chat execution UI.

## Architecture Boundaries

- Keep `packages/protocol` framework-free and host-agnostic.
- Keep `packages/adapter-openclaw` responsible for transport details, schema tolerance, and event normalization.
- Keep `packages/client` responsible for state reduction and session/run lifecycle, not rendering.
- Keep `packages/react` focused on rendering and user interactions over normalized data.
- Keep `apps/playground` as the place for local integration switches, host wiring, and debug UX.

## Product Constraints

- Preserve single-page conversation reading flow.
- Preserve inline media blocks and bottom meta bar.
- Preserve collapsible execution and thinking panels.
- Prioritize IM session switching and incremental refresh over manual refresh flows.

## Coding Rules

- Favor explicit type guards and narrow unions before reading event payload fields.
- Do not introduce openclaw-only fields into shared protocol types unless they are promoted into the qclaw-ui contract.
- Treat `sessionKey`, `runId`, `messageId`, and event sequencing as correctness-critical fields.
- Use minimal changes that respect existing package boundaries and public APIs.
- Add or update tests when changing normalization, stores, or protocol contracts.

## Required Doc Sync

- Protocol changes must update `docs/specs/protocol-v1.md`.
- Product or layout direction changes must update `docs/specs/rfc-v1.md`.
- Host integration behavior changes must update `docs/specs/openclaw-integration-v1.md`.
- Workspace/package responsibility changes must update `docs/specs/repo-bootstrap-v1.md`.