# Research 04: Storybook 10 / 11-beta packaging for the Figma QA kit

Date: 2026-11-21. Ticket: [`../issues/04-storybook-kit-packaging.md`](../issues/04-storybook-kit-packaging.md).
Installed here: `storybook` / `@storybook/*` **11.0.0-beta.3**, `@storybook/addon-designs` 12.0.0, Vitest 5.1.1. npm dist-tags today: `latest` = 10.6.8, `next` = 11.0.0-beta.3 (`npm view storybook dist-tags`).

Sources key: **[NM]** = installed `node_modules` (path given), **[MIG]** = `MIGRATION.md` on `next` (https://raw.githubusercontent.com/storybookjs/storybook/next/MIGRATION.md), **[DOCS]** = storybook.js.org (pages report "Version 10.6"), **[GH]** = storybookjs/storybook source, **[SK]** = vercel-labs/skills docs, **[VT]** = vitest.dev.

## TL;DR — recommended shape

One npm package (e.g. `@amber/figma-qa`), ESM-only, five entry points:

| Export | Role | Replaces today |
| --- | --- | --- |
| `./preset` | `viteFinal` (adds `/__visual` dev route plugin), optional `optimizeViteDeps` | `visualResultsPlugin()` in `.storybook/main.ts` |
| `./manager` | registers "Figma diff" panel (auto-loaded) | `registerFigmaDiffPanel()` in `manager.ts` |
| `./preview` | `definePreviewAddon({ initialGlobals: { figmaCompare: 'off' }, ... })` | `initialGlobals` in `preview.tsx` |
| `./vitest` | `figmaQaVitest(opts)` → Vite plugin (adds browser `commands` via `config` hook) + project factory (`vrt-figma` project, setup file inside package) | `vrtProject('vrt-figma', …)` + `commands.ts` wiring in `vitest.config.ts` |
| `bin` | `figma-qa` CLI: `init` (detect + merge), `doctor`, report run | `visual/run.ts`, manual wiring |
| `skills/<name>/SKILL.md` | agent skills in package; copied by `figma-qa init` (and discoverable by `npx skills experimental_sync`) | `.claude/skills/figma-matrix` |

Install flow: `pnpm add -D @amber/figma-qa` → `npx figma-qa init` which (1) checks Storybook major (10.6+ / 11), React + Vite, Vitest ≥4, (2) adds the package to `main.ts` `addons` (itself, or via `npx storybook add` which does the same edit but **no postinstall** for non-core addons — see §2), (3) lets Storybook sync the `./preview` addon into `definePreview({ addons })`, (4) patches/prints the Vitest project, (5) copies skills + writes `figma-qa.config.ts`.

Confidence: **high** on addon entry points and CSF-Next preview behaviour (verified in installed source); **medium** on `storybook add` behaviour in 10.x (read from GitHub `main`, not installed); **medium-low** on `skills experimental_sync` (explicitly experimental).

## 1. Addon entry points (both 10 and 11)

- Storybook resolves each `addons[]` entry by looking for `<pkg>/preset`, `<pkg>/manager`, `<pkg>/preview` (via package `exports` first) and builds a virtual preset: `presets: [presetFile]`, `managerEntries: [managerFile]`, `previewAnnotations: [previewFile]`. [NM `storybook/dist/_node-chunks/chunk-UVYV3XXW.js` `resolveAddonName`]. So `manager` and `preview` need **no** explicit `managerEntries`/`previewAnnotations` in the preset.
- Real example of a third-party addon spanning 10 and 11: `@storybook/addon-designs@12.0.0` peer `storybook: ^10.1.0-0 || … || ^11.0.0-0`; its preset only exports `managerEntries` (resolved with `fileURLToPath(import.meta.resolve(...))`) and `optimizeViteDeps`. [NM `@storybook/addon-designs/dist/preset.js`, `npm view @storybook/addon-designs@12.0.0 peerDependencies`]. This is the template to copy.
- Preset hooks available: `viteFinal`, `managerEntries`, `previewAnnotations`, `addons`, `entries`, `previewHead/Body`, `managerHead`, `babelDefault`, `webpackFinal`. [DOCS https://storybook.js.org/docs/addons/writing-presets]
- Storybook 10 rules: addons must be **ESM-only** ("Storybook 10 requires all addons to be built as ESM-only"), `./preset` → `./dist/preset.js`, root `preset.js` re-exports it, Node target `node20.19`, peer `storybook ^10.0.0`; widening to two majors is allowed but a new addon major per Storybook major is recommended. [DOCS https://storybook.js.org/docs/addons/addon-migration-guide]
- Storybook 10 loads main config and presets as ESM; `managerEntries` paths must be real file paths (`fileURLToPath`), relative imports need extensions. [MIG §"From version 9.x to 10.0.0"]

### Critical: CSF Next ignores preset `previewAnnotations`

When `preview.tsx` uses `definePreview` (this repo does), the Vite builder's generated project-annotations code returns **only** `preview.default.composed`; the `previewAnnotations` collected from presets are imported only in the non-CSF4 branch. [NM `node_modules/.pnpm/node_modules/@storybook/builder-vite/dist/_node-chunks/chunk-U4FBKTBH.js` `generateProjectAnnotationsCodeFromPreviews`, `isCsf4`]. Therefore the kit's preview side (`figmaCompare` global, any decorator) must be a `definePreviewAddon` export at `./preview`, listed in `definePreview({ addons: [figmaQa()] })`. `definePreviewAddon` is exported from `storybook/internal/csf` [NM `storybook/dist/csf/index.d.ts`].
- Storybook auto-syncs this: `syncStorybookAddons` reads main `addons` and, for non-core addons whose `<addon>/preview` resolves, adds an import of `${addon}/preview` into the preview `addons` array. [NM `storybook/dist/_node-chunks/chunk-UVYV3XXW.js` `getAddonAnnotations` / `syncPreviewAddonsWithMainConfig`]; docs: "the preview configuration will be automatically updated to reference the necessary addons" when installing an addon or running `storybook dev`. [DOCS https://storybook.js.org/docs/api/csf/csf-next]

## 2. `storybook add`, postinstall, automigrations

- `storybook add <pkg>`: installs as devDependency, edits main `addons` via `setupAddonInConfig`, then `if (!skipPostinstall && isCoreAddon(addonName)) await postinstallAddon(...)`; `isCoreAddon` = name is a key in Storybook's `versions` map. **Third-party postinstall never runs.** Same gate on `main` (10.x) and `next` (11). [GH https://raw.githubusercontent.com/storybookjs/storybook/main/code/lib/cli-storybook/src/add.ts and …/next/…/add.ts]
- 11: `add`/`remove` stop before editing main when `addons` is spread-overridden or a shared constant: "Add or remove the addon in `addons` by hand in that case." [MIG 11.0]
- Automigrations / codemods are Storybook-owned; `@storybook/codemod` is no longer published in 11 ("Codemods run through `storybook migrate`"), and 11 removes automigrations for ≤10. [MIG 11.0]. No public extension point for third-party automigrations was found → the kit must own its `init`/upgrade logic.
- `addon-vitest`'s own postinstall (what `storybook add @storybook/addon-vitest` runs) edits Vitest config with `storybook/internal/csf-tools` `SourceEditor`/`parseModule` [NM `@storybook/addon-vitest/dist/postinstall.js`]. 11 removed `storybook/internal/babel` ("csf-tools uses ESTree") [MIG 11.0] — so **internal AST APIs differ between 10 and 11; don't build the kit's config merger on `storybook/internal/*`**. Use a standalone AST tool (magicast/recast) or print-a-snippet fallback.

## 3. `@storybook/addon-vitest` extension points

- Public plugin options only: `configDir`, `storybookScript`, `storybookUrl`, `tags {include,exclude,skip}`, `disableAddonDocs`, `initialGlobals` (per-project globals — useful: a `vrt-figma` project can pin `figmaCompare` this way). [NM `@storybook/addon-vitest/dist/vitest-plugin/index.d.ts`]
- No hook to register extra projects/commands; the kit composes around `storybookTest()` in normal Vitest config (as `vitest.config.ts` does now).
- Library-provided browser commands: return `test.browser.commands` from a Vite plugin `config` hook. [VT https://vitest.dev/api/browser/commands.html]. Projects can also be injected by a plugin via `configureVitest({ injectTestProjects })` (Vitest ≥3.1; names must be unique). [VT https://vitest.dev/api/advanced/plugin.html]. Note the existing repo caveat: under `VITEST_STORYBOOK=true` `storybookTest()` renames projects to `storybook:<configDir>` → VRT projects must stay CLI-only (see `vitest.config.ts`).
- 11: addon-vitest requires Vitest ≥4, always uses `test.projects`, and throws `SB_ADDON_VITEST_0002` if a setup file calls `setProjectAnnotations` (the kit's `visual/figma/setup.ts` must not). [MIG 11.0]
- Peer ranges: addon-vitest 10.6.8 → `vitest ^4 || ^5`, `storybook ^10.6.8`; 11.0.0-beta.3 → `vitest ^4 || ^5`, `storybook ^11.0.0-beta.3`. [`npm view`, NM package.json]. So Vitest 4/5 is common ground; kit floor should be Storybook **10.6**.

## 4. Agent skills shipping

- Storybook itself: skills are **generated** per project by the CLI — `npx storybook skills <id> [--mcp]` (ids: component-docs, write-stories, test-stories, ui-review, setup). [NM `storybook/dist/bin/core.js` `SKILL_IDS`]. `skills` is a core command on `main` (10.x) too. [GH `code/core/src/bin/dispatcher.ts` on `main`]. Thin stub skills (`storybook-init/setup/upgrade`, `ui-review`…) are installed into `.agents/skills` + `.claude/skills` from git repo `storybookjs/skills` pinned to `ref: v11.0.0-beta.3`, `installMode: copy`, recorded in `skills-lock.json` (this repo's lock). 11 removed `storybook ai` → `storybook skills setup`. [MIG 11.0]
- `npx skills` (vercel-labs): sources = GitHub shorthand, git URL, local path, `owner/repo@tag`; `--copy` records `installMode: "copy"`; lock v2 stores `computedHash` + git `commit`. `experimental_sync` discovers skills shipped by npm deps (root `SKILL.md`, `skills/<name>/SKILL.md`, `dist/skills/<name>/SKILL.md`, or a `skills` array in `package.json`), links into `.agents/skills/` (+ `.claude/skills/` for Claude Code), updates with the dependency, uses `--frozen-lockfile` under CI. Marked experimental: may "change or be removed in any release without notice". [SK https://raw.githubusercontent.com/vercel-labs/skills/main/README.md, …/docs/commands.md]
- Recommendation: ship `skills/<name>/SKILL.md` inside the package (matches the sync convention), and have `figma-qa init` copy them (map decision: "copied on install") and write a `skills-lock.json` entry is optional; keep skills thin pointers to `npx figma-qa …` commands (Storybook's own pattern) so most guidance versions with the package, not the copy.

## 5. Detect and merge into an existing Storybook project

Detection (mirror Storybook's own `storybook-setup` skill rule): `storybook` in `package.json` or a `.storybook/` dir; read installed `storybook/package.json` version (≥10.6 required); framework `@storybook/react-vite`; preview uses `definePreview` (CSF Next) or classic.
Merge steps:
1. `main.ts` `addons` += kit (or `npx storybook add @amber/figma-qa` — installs + edits main, no postinstall; refuses unsafe shapes in 11 → fall back to printed instruction).
2. Preview: CSF Next → rely on Storybook sync / insert `figmaQa()` into `definePreview({ addons })`; classic preview → nothing (preset path works, preview export auto-loaded).
3. Vitest: if `vitest.config.*` has `storybookTest(` → append kit project via standalone AST edit; else run `npx storybook add @storybook/addon-vitest` first (core addon, its postinstall writes the config).
4. Never touch `addons.setConfig` / manager theme — kit's manager entry is self-contained.

## 6. 10 vs 11-beta breaking risks for this addon

| Area | Risk | Source |
| --- | --- | --- |
| `types.TAB` removed | none (panel uses `types.PANEL` + `AddonPanel`, still exported in 11) | [MIG 11.0], [NM `storybook/dist/components/index.d.ts`] |
| Deprecated `storybook/internal/components` UI (`IconButton`, `Tabs`…) removed | low — panel only imports `AddonPanel`; avoid other internal components | [MIG 11.0] |
| Emotion/theming moved to `storybook/theming/emotion`; `storybook/theming` types narrowed | low (panel uses own CSS `FIGMA_UI_CSS`) | [MIG 11.0] |
| `addons.setConfig` top-level layout/ui keys ignored | none for kit; don't set config from addon | [MIG 11.0] |
| `globalTypes.defaultValue` removed; seed via `initialGlobals` only | already compliant | [MIG 11.0] |
| `storybook/test` not a manager global | don't import it in `./manager` | [MIG 11.0] |
| `setProjectAnnotations` in setup files throws | ensure kit setup file never calls it | [MIG 11.0] |
| `storybook/internal/babel` gone, csf-tools on ESTree | don't depend on internal AST APIs | [MIG 11.0] |
| Node 22.12+, TS 5.9+, Vite 6.3+ in 11 (10: Node 20.19/22.12) | set kit `engines` to the 11 floor or test both | [MIG 11.0 / 10.0] |
| Peer range | one major covering both: `storybook: ^10.6.0 \|\| ^11.0.0-0` (addon-designs precedent); docs prefer one addon major per SB major | [DOCS addon-migration-guide], [NM addon-designs] |
| `@storybook/addon-mcp` latest peers `storybook ^10.6.8`, next is 11-only | kit must not hard-depend on addon-mcp | `npm view @storybook/addon-mcp` |

Open (not verified in installed 10.x): exact `syncStorybookAddons` behaviour on 10.6 and `storybook skills` output on 10.6 — check by installing 10.6.8 in a throwaway fixture when the kit spike starts.
