# 12: figma-qa init

**What to build:** `pnpm dlx @phenomenon-studio/storybook-figma-qa init` installs the QA kit into a project: adds the package, merges Storybook and Vitest config, installs agent skills and rules, and writes the registry scope line. Safe to re-run.

**Blocked by:** 02 Spike: skills add + magicast merge; 06 Project config seam

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] No Storybook → official `storybook init` for react-vite (latest 10; `--next` → 11 beta), then merge
- [ ] SB < 10.6 → refuse, point at `storybook upgrade`; non React + Vite → refuse naming what was found (exit 2)
- [ ] Adds `@storybook/addon-vitest` via `storybook add` only when missing
- [ ] Merges via magicast: `main` addons, CSF Next `definePreview({ addons })` (classic preview untouched), Vitest kit project; unsafe shapes → print exact snippet, exit 2
- [ ] Skills via `npx skills add` (or spike fallback); `AGENTS.md` marked block (and `CLAUDE.md` when it lacks `@AGENTS.md`), only between markers rewritten
- [ ] Project `.npmrc` gets only `@phenomenon-studio:registry=https://npm.pkg.github.com`
- [ ] Re-run on set-up fixture → no file changes, exit 0; `--dry-run` writes nothing and prints plan
- [ ] Never touches stories, components, tokens, manager theme, other Vitest projects, git, CI files
- [ ] Fixture CI runs `init --yes` on a clean copy of both fixtures
