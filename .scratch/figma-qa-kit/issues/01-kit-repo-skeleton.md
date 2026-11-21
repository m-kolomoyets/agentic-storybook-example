# 01: Kit repo skeleton + tracer CI

**What to build:** A new internal org monorepo (readable by all enterprise members) exists holding the QA kit package `@phenomenon-studio/storybook-figma-qa` (empty but with every planned entry point) and two react-vite fixture projects, one on Storybook 10.6 and one on Storybook 11 beta, wired to the package by hand. CI proves both fixtures boot Storybook with the kit addon loaded and that the `figma-qa` CLI runs.

**Blocked by:** None (can start immediately). HITL: creating the internal `Phenomenon-Studio/storybook-figma-qa` repo needs an org admin.

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] Repo `Phenomenon-Studio/storybook-figma-qa` created (internal), monorepo with the package and `fixtures/sb10`, `fixtures/sb11`
- [x] Package is ESM-only; exports `./preset`, `./manager`, `./preview` (`definePreviewAddon`), `./vitest`, bin `figma-qa`, bundled `skills/` dir
- [x] Peers `storybook ^10.6.0 || ^11.0.0-0`, `vitest ^4 || ^5`, `react`; engines Node ≥ 22.12, Vite ≥ 6.3
- [x] `figma-qa doctor` stub runs and exits 0 in both fixtures
- [x] CI on push/PR: matrix sb10 × sb11 on Node 22.12 + current LTS; each builds Storybook with the kit addon registered (empty panel visible)

## Answer

Done 2026-11-21 in `Phenomenon-Studio/storybook-figma-qa` `main` (`dbe716d`, `135cce5`); CI run 44906203101 green on all 4 cells (sb10/sb11 × Node 22.12.0/LTS).

- Repo is internal (enterprise-readable), not private: any enterprise project can install the package and call the reusable workflow without per-team grants.
- pnpm pinned to 10.x: pnpm 11 needs Node ≥ 22.13.
- Fixtures get an injected kit copy (`injectWorkspacePackages`) so peers resolve per fixture's Storybook / Vitest; the `figma-qa` bin links only after build, so setup is install → build → `install --offline`.
- Manager entry uses classic JSX: SB 10's manager shares `react` but not `react/jsx-runtime`, so automatic JSX bundled React 19 and broke the panel.
- `definePreviewAddon` comes from `storybook/internal/csf` (no public export; same as `@storybook/addon-designs`).
- Panel visibility proven by `scripts/smoke-panel.mjs` (Playwright against `storybook-static`).
