# 01: Kit repo skeleton + tracer CI

**What to build:** A new private org monorepo exists holding the QA kit package `@phenomenon-studio/storybook-figma-qa` (empty but with every planned entry point) and two react-vite fixture projects, one on Storybook 10.6 and one on Storybook 11 beta, wired to the package by hand. CI proves both fixtures boot Storybook with the kit addon loaded and that the `figma-qa` CLI runs.

**Blocked by:** None (can start immediately). HITL: creating the private `Phenomenon-Studio/storybook-figma-qa` repo needs an org admin.

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Repo `Phenomenon-Studio/storybook-figma-qa` created (private), monorepo with the package and `fixtures/sb10`, `fixtures/sb11`
- [ ] Package is ESM-only; exports `./preset`, `./manager`, `./preview` (`definePreviewAddon`), `./vitest`, bin `figma-qa`, bundled `skills/` dir
- [ ] Peers `storybook ^10.6.0 || ^11.0.0-0`, `vitest ^4 || ^5`, `react`; engines Node ≥ 22.12, Vite ≥ 6.3
- [ ] `figma-qa doctor` stub runs and exits 0 in both fixtures
- [ ] CI on push/PR: matrix sb10 × sb11 on Node 22.12 + current LTS; each builds Storybook with the kit addon registered (empty panel visible)
