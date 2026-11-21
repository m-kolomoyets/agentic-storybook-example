# Kit source repo and migrating this repo onto the kit

Type: task
Status: resolved
Blocked by: —

## Question

HITL. Publishing via Actions `GITHUB_TOKEN` requires the kit source in a `Phenomenon-Studio`-owned repo; this repo is personal (`m-kolomoyets/agentic-storybook-example`). Decide: new org repo (kit only, or monorepo with fixtures) vs transferring this repo; then how this repo moves from in-tree `visual/` to the published kit (big-bang vs staged), fate of `pnpm vrt figma`, `visual/figma/__refs__` → `refsDir`, and the `argos`/`diy`/`chromatic` experiments. Record repo name/URL and the migration order.

## Answer

Decided with the human, 2026-11-21.

- **Kit repo**: new org monorepo `Phenomenon-Studio/storybook-figma-qa` (planned URL `https://github.com/Phenomenon-Studio/storybook-figma-qa`, private). Layout: `packages/storybook-figma-qa/` (the published `@phenomenon-studio/storybook-figma-qa`) + `fixtures/sb10/`, `fixtures/sb11/` (react-vite projects for the CI matrix). Not created yet: the first implementation ticket creates it (plan, don't do).
- **This repo** (`m-kolomoyets/agentic-storybook-example`) stays personal; it becomes the kit's first consumer, not its source.
- **Migration: staged, parity cutover**.
  1. Kit built in the org repo, seeded from `visual/figma/*` (copy + reshape to the decided design; this repo untouched meanwhile).
  2. Kit `0.x` published once its fixture run passes.
  3. Parity check: kit report on this repo's 4 `figma`-tagged stories matches the in-tree report (same cells, same verdicts).
  4. One cutover PR here: registry `.npmrc` scope line + `pnpm dlx @phenomenon-studio/storybook-figma-qa init`; stories get `parameters.design` entries + `figma` tag (Story → Figma mapping); delete `visual/figma/` incl. `sets.ts`; `git mv visual/figma/__refs__ figma-qa/__refs__` (the `refsDir` default, no config key needed), then `figma-qa report --refresh` if the refs format changed; drop the `figma` subcommand from `visual/run.ts`; `figma-matrix` skill replaced by the kit's skills.
- **`pnpm vrt figma`**: removed at cutover → `figma-qa report`.
- **DIY / Argos / Chromatic experiments**: out of the kit; stay as this repo's own business, untouched (incl. `pnpm vrt diy|argos|chromatic|all`, `visual/runs.jsonl`, Chromatic job in `ci.yml`).
- **Addendum (Scaffold a Figma story, 2026-11-21)**: cutover PR also moves the 4 Figma stories out of `<C>.stories.tsx` into sibling `<C>.figma.stories.tsx` files (title + `/Figma`).
