# 12: figma-qa init

**What to build:** `pnpm dlx @phenomenon-studio/storybook-figma-qa init` installs the QA kit into a project: adds the package, merges Storybook and Vitest config, installs agent skills and rules, and writes the registry scope line. Safe to re-run.

**Blocked by:** 02 Spike: skills add + magicast merge; 06 Project config seam

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] No Storybook → official `storybook init` for react-vite (latest 10; `--next` → 11 beta), then merge
- [x] SB < 10.6 → refuse, point at `storybook upgrade`; non React + Vite → refuse naming what was found (exit 2)
- [x] Adds `@storybook/addon-vitest` via `storybook add` only when missing
- [x] Merges via magicast: `main` addons, CSF Next `definePreview({ addons })` (classic preview untouched), Vitest kit project; unsafe shapes → print exact snippet, exit 2
- [x] Skills via `npx skills add` (or spike fallback); `AGENTS.md` marked block (and `CLAUDE.md` when it lacks `@AGENTS.md`), only between markers rewritten
- [x] Project `.npmrc` gets only `@phenomenon-studio:registry=https://npm.pkg.github.com`
- [x] Re-run on set-up fixture → no file changes, exit 0; `--dry-run` writes nothing and prints plan
- [x] Never touches stories, components, tokens, manager theme, other Vitest projects, git, CI files
- [x] Fixture CI runs `init --yes` on a clean copy of both fixtures

## Answer

Done 2026-11-24 in `Phenomenon-Studio/storybook-figma-qa` `main`, commits `227dba0` (feature) and `d21fa77`. CI is green on all four jobs: [run 45460464732](https://github.com/Phenomenon-Studio/storybook-figma-qa/actions/runs/45460464732). `d21fa77` fixes the browser tests from `8834957`, which had been red on CI since that commit: their temp `XDG_CACHE_HOME` hid Linux Playwright's browsers. `pnpm test` passes 176/176. That includes `test/init-cli.test.ts`, which removes the kit from a copy of each fixture and then runs `init --yes` for real (skills via npx), `doctor` and a re-run. CI runs it in every fixture × Node job.

Decisions later tickets need:

- **Order.** Storybook detection → `.npmrc` scope line → kit install → `storybook add @storybook/addon-vitest` (only when missing from package.json) → merges → `figma-report` script → rules → skills. The scope line comes before the kit install because the install needs it.
- **Bootstrap.** With no Storybook, init runs `npx -y storybook@^10 init --type react --builder vite --yes --no-dev --disable-telemetry` (`--next` → `storybook@next`). The React + Vite check reads only package.json `react` and `vite`. Tests cover the bootstrap and the addon-vitest add only as `--dry-run` plans; the real network installs are not exercised.
- **Version and framework.** The Storybook version is the installed `node_modules/storybook` version. The framework is read from `.storybook/main` as text (`'x'`, `{ name: 'x' }`, `fn('x')`) and must contain `@storybook/react-vite`.
- **Merges** (`src/node/merge.ts`, magicast). They implement ticket 02's table. On an unsafe shape init still finishes the other steps, then prints a fixed snippet per file (`MAIN_SNIPPET` / `PREVIEW_SNIPPET` / `VITEST_SNIPPET`) and exits 2. A classic preview is skipped. New nodes follow the file's quote style. recast may re-indent the nodes it touches, and init does not format.
- **Skills.** `skills@1.9.0` is pinned. The CLI is skipped when every file in the kit's `skills/` already matches its copy in `.agents/skills` and `.claude/skills`, so a re-run needs no network. A skill file deleted in a newer kit is not detected (ticket 18 / upgrade).
- **Beyond the ticket.** init adds `"figma-report": "figma-qa report"` when no script has that name, because the docs and skills use that alias. `--yes` is accepted but has no effect until ticket 13 adds prompts.
- **Rules block.** It is replaced between `<!-- figma-qa:start -->` and `<!-- figma-qa:end -->`. A start marker with no end marker appends a fresh block.
- **Gotcha.** pnpm 11 outside the kit workspace tries to install before `pnpm exec`. The tests call the copy's `node_modules/.bin/figma-qa` directly.
- **Not done.** `figma-qa migrate` on upgrade (ticket 18). `figma-qa/.results/` is not gitignored in consumers: no step adds it.
