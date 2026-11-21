# 02: Spike: skills add from local path + magicast merge on SB 11 definePreview

**What to build:** De-risk the two unknowns `init` depends on. Answer, with a throwaway run against the fixtures: does `npx skills add <installed-package>/skills --copy -y` install skills from a local package path into `.agents/skills` + `.claude/skills` with `skills-lock.json`; and can magicast add the kit addon to a CSF Next `definePreview({ addons })` preview, `main` addons, and a Vitest config with projects, on both Storybook majors.

**Blocked by:** 01 Kit repo skeleton + tracer CI

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] Written result per question (works / fails + why) recorded as a comment on this ticket
- [x] If local-path `skills add` fails: fallback (copy into `.agents/skills/` + symlink into `.claude/skills/`) confirmed workable
- [x] List of config shapes magicast can merge safely vs shapes that must fall back to printing a snippet
- [x] No spike code merged into the package

## Answer

Run 2026-11-21 against scratch copies of `fixtures/sb10` (SB 10.6.8, Vitest 4) and `fixtures/sb11` (SB 11.0.0-beta.3, Vitest 5) from kit `main` `135cce5`. Spike code stayed in a scratch dir; kit repo untouched (`git status` clean).

### Q1: `npx skills add <installed-kit>/skills --copy -y` (skills 1.9.0): works, with one required flag

- Local path accepted (`sourceType: "local"`). Writes `.agents/skills/figma-qa` + `.claude/skills/figma-qa` (real copies) and `skills-lock.json` v2 with a **relative** `source` (`./node_modules/@phenomenon-studio/storybook-figma-qa/skills`), `computedHash`, `installMode: "copy"`: safe to commit.
- Works through a pnpm-style symlinked `node_modules/@scope/pkg` → `.pnpm/...`.
- Re-run with unchanged skills: zero diff. Changed `SKILL.md`: both copies and the lock hash update. So init can re-run it blindly on upgrade.
- **Must pass agents explicitly.** Without `-a`, targets come from agents detected on the machine (`AI_AGENT`/`CLAUDECODE` env, `~/.claude` etc.). With nothing detected (CI, fresh machine) it installs into ~55 agent dirs (`.windsurf/`, `.roo/`, `.kiro/`, …). `-a claude-code codex` (space-separated or repeated `-a`) → exactly `.agents/skills` + `.claude/skills`. Comma list and unknown agent names exit 1.
- Init command: `DISABLE_TELEMETRY=1 npx -y skills@<pinned> add ./node_modules/@phenomenon-studio/storybook-figma-qa/skills --copy -y -a claude-code codex` (pin the version; the CLI sends install telemetry unless `DISABLE_TELEMETRY`/`DO_NOT_TRACK` is set).
- Fallback (copy + symlink) not needed. Spec updated with the exact command.

### Q2: magicast 0.5.5 merge: works on both majors

Approach: `parseModule` → walk `$ast` from the default export (unwrap `satisfies`/`as`/parens, follow `export default <const>`), edit only literal arrays, add imports via `mod.imports.$append`, `generateCode`. Every safe case re-runs to an identical file. End-to-end: kit stripped from both fixtures' `main.ts`/`preview.ts`, merged back by the script, `storybook build` exit 0 on SB 10 and SB 11, and `scripts/smoke-panel.mjs` sees the "Figma diff" panel on both.

Generated code is reformatted locally by recast (e.g. `projects: [{ … }, figmaQa()]` on one bracket line, blank lines between imports kept, 2-space indent in touched nodes). Valid but not prettier-clean; init should not try to format.

**Safe to merge**

| File | Shape | Result |
| --- | --- | --- |
| main | `const config: StorybookConfig = {…}; export default config` | append `'@phenomenon-studio/storybook-figma-qa'` |
| main | `export default {…}`, `{…} satisfies StorybookConfig` | append |
| main | `export default defineMain({…})` (CSF Next, both majors) | append |
| main | no `addons` key | add `addons: [kit]` |
| main | addons with `{ name, options }` entries or `getAbsolutePath('…')` calls | append; kit as string or `{ name: kit }` counts as present |
| preview | `export default definePreview({ addons: [...] })` | add `import figmaQa from '…/preview'`, append `figmaQa()` |
| preview | `definePreview({})` / no `addons` key | add `addons: [figmaQa()]` |
| preview | `const preview = definePreview({…}); export default preview` | append |
| preview | kit imported under another local name | detected as present (match by import source) |
| preview | local `figmaQa` taken by another import | import as `figmaQa2` |
| preview | classic `const preview: Preview = {…}` (not CSF Next) | skip: preset `previewAnnotations` apply |
| vitest | `@storybook/addon-vitest` template, SB 10.6 (`dirname` shim) and SB 11 (`import.meta.dirname`) | append kit entry to `test.projects` + import |
| vitest | `vite.config` `defineConfig({ plugins, test: { projects } })` | append |
| vitest | `mergeConfig(viteConfig, defineConfig({ test: { projects } }))` | append in last arg |
| vitest | `projects: ['packages/*']` globs | append (mixed array is valid) |

**Unsafe → print snippet, exit 2**

| File | Shape | Why |
| --- | --- | --- |
| any | `addons`/`projects` is a variable, call result, or contains a spread | contents unknown; editing could duplicate or hide entries |
| any | config object has a spread and no literal key (`{ ...base }`) | key may come from the spread |
| main | `export default function` / async factory | no static object |
| main | CommonJS `module.exports` (`main.cjs`) | out of scope; SB 10.6+ init writes ESM |
| preview | `definePreview(<non-literal>)` | no static object |
| vitest | `defineConfig(({ mode }) => …)` / function export | return value not static |
| vitest | `test` without `projects` (root `test.browser`, single project) | needs restructuring root test into a project; user's call |
| vitest | no `test` block at all (plain `vite.config`, no `vitest.config`) | nothing to merge into; init should `storybook add @storybook/addon-vitest` first, then merge |

Open for ticket 06/12: what the kit Vitest entry looks like (project factory call in `test.projects` vs plugin in the storybook project). The spike appended `figmaQa()` from `./vitest` to `test.projects`; appending to that project's `plugins` is the same literal-array edit with the same safe/unsafe split.
