# Storybook 10 / 11-beta packaging mechanisms for the kit

Type: research
Status: resolved
Blocked by: —

## Question

Kit = addon (manager panel, preview global, Vite dev route `/__visual`) + Vitest browser project (`vrt-figma`, setup file, custom commands) + CLI + agent skills/rules. Today wired by hand in `.storybook/main.ts` (`visualResultsPlugin`), `manager.ts` (`registerFigmaDiffPanel`), `preview.tsx` (`figmaCompare` global), `vitest.config.ts`. From Storybook 10 and 11-beta primary docs/source: addon presets (`preset.js`: `viteFinal`, `managerEntries`, `previewAnnotations`), `storybook add` + automigrations/postinstall, `@storybook/addon-vitest` extension points, `create-storybook`/`storybook init` hooks, codemod APIs; what changed in 11 beta that breaks a 10 addon. How do comparable tools ship agent skills/rules with an npm package (e.g. `npx skills`, `skills-lock.json` already in repo, Storybook MCP's `ui-review` skill install)? How to detect and merge into a project that already has Storybook.

## Answer

Full findings: [`../research/04-storybook-kit-packaging.md`](../research/04-storybook-kit-packaging.md).

- One ESM-only npm package, peer `storybook ^10.6.0 || ^11.0.0-0` (addon-designs 12 precedent). Exports `./preset` (`viteFinal` → `/__visual` plugin), `./manager` (panel), `./preview` (`definePreviewAddon` with `figmaCompare` initial global), `./vitest` (plugin with browser `commands` + `vrt-figma` project factory), `bin` CLI, `skills/<name>/SKILL.md`.
- Storybook auto-loads `<pkg>/preset|manager|preview`. With CSF Next `definePreview`, preset `previewAnnotations` are **ignored**: preview side must be in `definePreview({ addons })` (Storybook syncs `<addon>/preview` in automatically).
- `storybook add` edits main but runs postinstall **only for core addons** → kit needs its own `figma-qa init` (detect SB ≥10.6 + react-vite + Vitest ≥4, merge vitest config with a standalone AST tool, not `storybook/internal/csf-tools`, which changed in 11).
- addon-vitest has no project/command hooks; compose around `storybookTest()`; never call `setProjectAnnotations` in setup (11 throws).
- Skills: ship in package, copy on `init`; `npx skills experimental_sync` can also discover them (experimental). Keep skills thin, pointing at CLI commands.
- 10→11 risks for the panel are low (PANEL + `AddonPanel` survive); main ones: Node 22.12/Vite 6.3 floors, internal AST API change, no `storybook/test` in manager.
