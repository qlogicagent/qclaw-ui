# qclaw-ui Repository Bootstrap v1

Source baseline: `steup/new/qclaw-ui-仓库初始化脚手架清单-v1.md`.

## Repository Role

qclaw-ui is a standalone workspace and should not be folded back into the openclaw repository.

One-line summary:

> qclaw-ui is a standard chat execution UI that keeps the openclaw visual baseline while improving execution folding and IM real-time refresh.

## Initial Published Packages

- `@qclaw-ui/protocol`
- `@qclaw-ui/client`
- `@qclaw-ui/react`
- `@qclaw-ui/theme-openclaw`
- `@qclaw-ui/adapter-openclaw`

## Workspace Stack

- package manager: pnpm workspace
- language: TypeScript
- UI: React 18
- app dev/build: Vite
- package build: tsup
- tests: Vitest

## Baseline Directory Layout

```text
qclaw-ui/
|- apps/
|  |- playground/
|  `- docs/
|- packages/
|  |- protocol/
|  |- client/
|  |- react/
|  |- theme-openclaw/
|  `- adapter-openclaw/
|- docs/specs/
|- .github/
|- AGENTS.md
`- README.md
```

## Package Responsibilities

- `packages/protocol`: no React dependency, safe for reuse across hosts.
- `packages/client`: event reduction, history loading, reconnection, and active session logic.
- `packages/react`: rendering layer only.
- `packages/theme-openclaw`: theme tokens and visual baseline.
- `packages/adapter-openclaw`: tolerant normalization of openclaw payloads.
- `apps/playground`: local integration and parity verification surface.
- `apps/docs`: documentation and demonstrations.

## Workspace Rules

- keep root scripts simple and workspace-wide
- avoid heavyweight app frameworks for v1
- avoid SSR and native shell expansion in the initial phase
- keep package boundaries clear enough for separate npm publishing later

## Root Script Expectations

- `pnpm dev`: run the playground app
- `pnpm dev:docs`: run the docs app
- `pnpm build`: build all packages and apps
- `pnpm test`: run package tests
- `pnpm lint`: run package lint steps when present
- `pnpm typecheck`: run package type checks