# Spec: Figma QA kit — one-command Figma report, installable kit, faster run

Status: ready-for-agent
Map: [Figma QA standard](../figma-standard/map.md) (all tickets resolved 2026-11-21)

## Problem Statement

Developers on Phenomenon projects want to know, per component, whether the implemented Storybook stories match the designers' UI kit in Figma. Today that check exists only inside one personal repo and is hard to use:

- A first Figma report takes ~10 manual steps (token, Docker browser, sync, variable naming round trip, rerun, open), and the agent skill has to drive most of them in prose.
- A Figma set URL is written three times (a central set registry, the story's matrix block, the story's Design link), so links drift.
- A warm run of 4 stories takes ~57 s (up to 88 s); most time is spent on duplicated screenshots and collecting 60 story files to use 4.
- Nothing is packaged: another project cannot install the check, its Storybook panel, the agent skills or the CI job without copying code by hand, and Storybook 11 beta is not considered.
- Designers have no shared artifact from PRs; CI does not run the check at all.

## Solution

A **QA kit**: one npm package, `@phenomenon-studio/storybook-figma-qa`, published to GitHub Packages from a new org repo, that any React + Vite project on Storybook 10.6+ or 11 beta installs with one command.

- `pnpm dlx @phenomenon-studio/storybook-figma-qa init` adds the package, merges Storybook / Vitest config, installs agent skills and rules, and runs a short wizard for the human-only items (Figma token, Docker image).
- `figma-qa report` (alias `pnpm figma-report`) is the one command: doctor → browser → lazy sync → tests → report → open, never prompting, exit 0 / 1 / 2.
- Each **Figma story** links its component sets once, in `parameters.design`; the `figma` tag opts it in. No central registry.
- `figma-qa scaffold <ui-kit-url>` writes a starter Figma story from a UI-kit page.
- A warm run of the current 4 stories (180 cells) drops to ≤ 25 s.
- A reusable GitHub Actions workflow runs the report on every PR, scoped to stories the change affects, and posts one sticky summary comment plus the HTML report as an artifact for designers.

## User Stories

### Running the Figma report

1. As a developer, I want one command that produces the Figma report, so that I don't have to remember sync, variables, browser and open steps.
2. As a developer, I want the command never to prompt, so that it behaves the same in my terminal, in an agent session and in CI.
3. As a developer, I want the report to run offline from committed refs when I have no Figma token, so that I can check my work without credentials.
4. As a developer, I want a set with no cached refs to fail with "set X not cached; run with token", so that I know exactly why the run cannot proceed.
5. As a developer, I want the pinned Docker browser started automatically when Docker exists, so that my pixels match CI.
6. As a developer without Docker, I want the run to fall back to my host Chromium with a clear "pixels not comparable to CI" banner, so that I still get a result and know its limits.
7. As a developer, I want exit code 0 when every cell passes, is approved or has no code equivalent, so that scripts can trust success.
8. As a developer, I want exit code 1 when any cell differs from Figma, so that design regressions fail builds.
9. As a developer, I want exit code 2 for harness or setup errors (misconfigured Figma story, uncached set, unreachable browser, rejected token), so that infrastructure problems are never mistaken for design verdicts.
10. As a developer, I want warnings (unnamed variables, host browser, Figma changed since sync) never to fail the run, so that noise doesn't block me.
11. As a developer, I want to filter the run by component name or story-id glob, so that I can iterate on one component quickly.
12. As a developer, I want `--changed [base]` to run only Figma stories affected by my git diff through the import graph, so that runs stay short on large projects.
13. As a developer, I want `--refresh` to adopt the current Figma version explicitly, so that ref updates are deliberate commits.
14. As a developer, I want a warning when Figma changed since the last sync, so that I know my refs may be stale without the run refetching on its own.
15. As a developer, I want the HTML report to open at the end of a local run, and the Storybook "Figma diff" URL printed when Storybook is up, so that I land on the result.
16. As a developer, I want `--no-open` and `--json`, so that I can script the command and read a machine summary on stdout.
17. As a developer, I want phase timings in `--json` and in the report, so that I can see where run time goes.
18. As a developer, I want each failing cell pre-classified (harness / token / value) where the category is deterministic, so that I spend judgment only on design-vs-code decisions.
19. As a developer, I want a ready-to-paste `approved` entry printed for each failing cell, so that recording a deliberate deviation is a copy-paste plus a reason.
20. As a developer, I want a11y checks to stay in the existing story test run, so that the Figma report has one job.

### Linking stories to Figma

21. As a developer, I want to write each component set URL once, as a named `parameters.design` entry, so that links never drift between registry, matrix and Design panel.
22. As a developer, I want entry names to be code variant names, so that they double as Design panel tab labels and survive Figma set renames.
23. As a developer, I want matrix blocks to reference a `design` entry by name and carry only extras (layout, approvals), so that a single-set story's block can omit the reference.
24. As a developer, I want the `figma` tag to be the only discovery rule, so that stories with ordinary frame or page Design links are never checked by accident.
25. As a developer, I want a `figma`-tagged story with no `figma` design entry or no matrix to be a hard error, so that half-configured stories never pass silently.
26. As a developer, I want sets synced lazily per story with concurrent requests coalesced per file, so that there is no registry or pre-pass to maintain.
27. As a developer, I want cells bound to Figma variants automatically from the variant's properties and the layout, so that I only write `renderCell(props)`.
28. As a developer, I want variants with no code equivalent reported as missing rather than failing, so that partial implementations read honestly.
29. As a developer using several Figma files, I want each URL's file key to be honoured, so that one UI kit is the norm but not a constraint.

### Scaffolding a Figma story

30. As a developer, I want `figma-qa scaffold <url...> --story <path>` to create a starter Figma story from a UI-kit page, section, frame or single set, so that I don't enumerate sets by hand.
31. As a developer, I want the scaffold written to a separate kit-owned `<Component>.figma.stories.tsx`, so that my own story files are never AST-edited.
32. As a developer, I want the scaffold's title to nest under the component's existing stories (sibling title + `/Figma`), so that the sidebar stays organized.
33. As a developer, I want entry names defaulted from Figma set names in kebab-case with the component prefix stripped, so that the scaffold is close to correct before I rename.
34. As a developer, I want the layout defaulted (State → columns, Size → sections, rest → rows) and written explicitly, so that I can tweak it in place.
35. As a developer, I want each block's cell renderer stubbed to render nothing, so that an unfinished scaffold fails the report visibly instead of passing.
36. As a developer, I want a re-run to append only sets not already linked (matched by node id), never renaming, reordering or removing, so that scaffold is safe to repeat.
37. As a developer, I want sets removed from Figma reported as warnings, so that I decide what to delete.
38. As a developer, I want `scaffold --dry-run` to print the diff, so that I can review before writing.
39. As a developer, I want scaffold to warm the refs cache for new sets, so that my first report after scaffolding doesn't refetch.
40. As an agent, I want the kit skill to take over after scaffold (rename entries to real variants, write cell bodies), so that judgment work is separated from deterministic writing.

### Variables and tokens

41. As a developer, I want Figma colours bound to variables to be compared against my CSS tokens by name, so that "right value, wrong token" is caught.
42. As a developer, I want tokens read from the loaded stylesheets at runtime with a configurable prefix, so that I never list token files.
43. As a developer, I want unnamed variable ids to fall back to value matching, labelled as a guess with one warning line, so that missing names never block a run.
44. As an agent, I want `figma-qa variables` to print the Plugin API naming script and merge its output into the committed variables file, so that naming new ids is one in-session step.
45. As a developer, I want a `tokenName` hook in the project config, so that project-specific naming quirks live in the project, not the kit.

### Installing the kit

46. As a developer, I want `pnpm dlx @phenomenon-studio/storybook-figma-qa init` to do the whole install, so that adoption is one command.
47. As a developer on a project with no Storybook, I want init to bootstrap Storybook for React + Vite first, so that I can start from zero.
48. As a developer on Storybook < 10.6 or a non React + Vite stack, I want init to refuse and say what it found, so that I don't get a half-working setup.
49. As a developer, I want init to merge `main`, preview (CSF Next `definePreview` addons) and Vitest config safely, and print the exact snippet with exit 2 when my config shape is unsafe to edit, so that my config is never mangled.
50. As a developer, I want init to install the kit's agent skills via `npx skills add` and add a marked rules block to `AGENTS.md` (and `CLAUDE.md` when it doesn't import `AGENTS.md`), so that agents know the workflow.
51. As a developer, I want init re-runs to change nothing on a set-up project and `--dry-run` to print the plan, so that init is safe to repeat and on upgrades.
52. As a developer, I want init never to touch my stories, components, tokens, manager theme, other Vitest projects, git or CI files, so that the blast radius is known.
53. As a developer, I want an optional `figma-qa.config.ts` with defaults for every key (`tokens.prefix`, `tokenName`, `icons`, `refsDir`, `maxDiffRatio`), so that most projects need no config.
54. As a developer, I want unknown config keys to be an error, so that typos don't silently do nothing.
55. As a developer, I want my icon set wired into Figma cells from a glob, so that icon-bearing variants render real glyphs.

### First-run wizard

56. As a developer, I want the wizard to reuse doctor checks and prompt only for missing human items, so that a complete setup is all green with no questions.
57. As a developer, I want my `FIGMA_TOKEN` validated against Figma and, if a Figma story exists, against its file, so that I learn about access problems at setup.
58. As a developer, I want the token written to `.env.local` only when that file is gitignored, so that secrets never get committed.
59. As a developer, I want a one-line Dev/Full seat requirement and 429s reported with the rate-limit type, so that seat problems are diagnosable.
60. As a developer with Docker, I want a Y/n prompt to pull the pinned browser image; without Docker, an info line about the host fallback.
61. As a developer, I want registry auth documented as a `gh` one-liner into my user `~/.npmrc`, with init writing only the scope line into project `.npmrc`, so that tokens stay user-level.
62. As an agent or CI, I want `--yes` / non-TTY to skip prompts, secrets and pulls, print the remaining checklist and exit 0.

### CI and designers

63. As a tech lead, I want a reusable workflow `figma-qa.yml@v1` and a short caller snippet printed by init and the docs, so that adding the PR check is a copy-paste.
64. As a tech lead, I want the check on every PR scoped by `--changed base.sha`, with an optional `paths` input, so that unaffected PRs exit fast.
65. As a tech lead, I want the pinned browser as a job service container owned by the kit, so that CI pixels are stable.
66. As a tech lead, I want a per-repo `FIGMA_TOKEN` secret, the job skipped with a notice when it's missing, and a "rotate repo secret" message on 401/403, so that token problems are clear.
67. As a reviewer, I want one sticky PR comment summarising per-story pass / fail / approved cells and triage category, distinguishing design failures from harness errors, so that I read the result in the PR.
68. As a designer, I want the HTML report as a 14-day PR artifact linked from the comment, so that I can review the implementation without a dev environment.
69. As a developer, I want the Storybook "Figma diff" panel and the HTML report rendered from the same results model, so that they never disagree.

### Speed

70. As a developer, I want a warm run of the 4 current Figma stories to finish in ≤ 25 s, so that I run it often.
71. As a developer, I want only Figma stories collected by Vitest, so that startup isn't spent on unrelated story files.
72. As a developer, I want one screenshot per cell with the pixel diff done in Node and pipelined, so that per-cell overhead stays ≤ 150 ms.
73. As a developer, I want an unchanged Figma version to cost zero heavy Figma calls, so that repeated runs don't hit rate limits.

### Kit maintenance

74. As a kit maintainer, I want the kit in `Phenomenon-Studio/storybook-figma-qa` with SB 10 and SB 11 fixture projects, so that both Storybook majors are proven on every change.
75. As a kit maintainer, I want CI to run offline against committed fixture refs and recorded Figma responses, plus a nightly live job, so that PR CI never depends on a seat or token.
76. As a kit maintainer, I want publishing on GitHub Release via `GITHUB_TOKEN`, prereleases on the `next` tag and the `vN` workflow tag moved automatically, so that no publish secret exists.
77. As a kit maintainer, I want semver with any config or committed-refs format change as a major, shipping a `figma-qa migrate` step that init runs on upgrade, so that consumers upgrade safely.
78. As the owner of this repo, I want a staged migration (build, publish 0.x, parity on 4 stories, one cutover PR), so that the in-tree check keeps working until the kit is proven.

## Implementation Decisions

### Package and repo
- New internal org monorepo (readable by all enterprise members, so any project can install the package and call the reusable workflow) `Phenomenon-Studio/storybook-figma-qa`: the published package plus `fixtures/sb10` and `fixtures/sb11` react-vite projects. The first implementation ticket creates it; the kit is seeded by copying and reshaping this repo's in-tree Figma pipeline.
- One ESM-only package `@phenomenon-studio/storybook-figma-qa` on GitHub Packages. Peers: `storybook ^10.6.0 || ^11.0.0-0`, `vitest ^4 || ^5`, `react`, `@storybook/addon-vitest`, `@vitest/browser-playwright`. Engines: Node ≥ 22.12, Vite ≥ 6.3.
- Exports: `./preset` (`viteFinal` adds the results dev route and the config / icons virtual modules), `./manager` (Figma diff panel), `./preview` (`definePreviewAddon` with the compare global, `FigmaMatrix`, `FigmaIcon`), `./config` (`defineConfig`, `iconName`), `./vitest` (plugin with browser commands and the Figma project factory, composed around `storybookTest()`), bin `figma-qa`, bundled `skills/`. Heavy CLI deps lazy-loaded.
- Under CSF Next `definePreview`, preset `previewAnnotations` are ignored: the preview side must be in `definePreview({ addons })`. Never call `setProjectAnnotations` in the setup file (throws on 11). Never use `storybook/internal/*` AST APIs (changed in 11); use magicast.
- Versioning: semver; any `figma-qa.config.ts` or committed refs format change is a major and ships a `figma-qa migrate` step run by `init` on upgrade.

### CLI surface
- `figma-qa report` (default), `doctor`, `init`, `variables`, `scaffold`, `migrate`. Only `init` prompts.
- `report` flags: positional filters (component name / story-id glob), `--changed [base]`, `--refresh`, `--ci`, `--host-browser`, `--no-open`, `--json`. No `--update`, no tolerance flags.
- Exit codes: 0 pass / approved / no-code only; 1 any fail cell; 2 harness or setup error. Warnings never change the exit code.
- `--ci`: no open, no Docker start, writes a markdown summary file for the PR comment and the HTML report directory as artifact.
- Figma REST base URL overridable by environment variable (test double for the network edge).

### Story → Figma mapping
- `parameters.design` (addon-designs array of named `figma` entries) is the only place a set URL is written; one entry per component set; names = code variant names.
- `parameters.figmaMatrix.blocks[]` reference a design entry by `name` and carry only `layout` and `approved` (story-wide `maxDiffRatio` and `ignore` sit beside `blocks`); a single-set story may omit the reference. Layout shape: `{ sections: string | null; columns: string }`, other axes combined as rows.
- Discovery = `figma` tag. Tagged story without a `figma` design entry or without `figmaMatrix` → exit 2.
- Sync is lazy: each Figma story calls browser command `figmaEnsureSets(urls)` before its checks; Node coalesces concurrent calls per file key in a short window (≈ one `/nodes` per file), then serves from cache. No generated registry, no pre-pass.
- Offline / no token: committed cache; only a set with no cached refs fails.
- Cell binding derived: manifest variants laid out by `layout`, stamped `data-figma-variant` by the matrix grid; authors write only `renderCell(props)`; no code equivalent → `data-figma-missing`.

### Figma fetch and caching
- Cache key = `version` from `/meta`. Unchanged version → zero Tier-1 calls; `--refresh` (needs a token for `/meta`) rebuilds without `/nodes` / `/images` from locally kept raw `/nodes` JSON, else keeps the committed refs.
- Changed version with `--refresh` (or an uncached set) → one full `/nodes` (no `depth`, no `geometry`), hash each set's subtree, request `/images` (png, scale 2, absolute bounds) only for sets whose hash changed. Chunk ids only as a fallback.
- Committed `refsDir` (default `figma-qa/__refs__`): variant PNGs, per-set manifest (gains subtree hash + file `version`, enabling "Figma changed since sync" without refetch), `catalog.json`, `variables.json`.
- Gitignored local cache under `node_modules/.cache/figma-qa/`: raw `/nodes` JSON, flattened refs. No Figma-specific CI cache.
- Token owner needs a Dev/Full seat on the UI kit file's plan; on 429 log `X-Figma-Rate-Limit-Type`.

### Comparison and pixel diff
- One `page.screenshot` per cell, sent to Node command `figmaPixelDiff`; Node flattens the ref once per (ref hash, backdrop), memoized in memory and on disk, then pixelmatches. Replaces browser canvas flatten and the second screenshot / `toMatchScreenshot`.
- Pipelined: capture cell N, fire the Node diff unawaited, continue; the story awaits all diffs at the end. File-level Vitest parallelism kept; no sharding, no per-block capture.
- Diff map computed once in Node when results are written, persisted in results JSON; panel and HTML report only render it; panel uses one shared QueryClient.
- CLI statically scans story files for a `figma` tag literal and passes the list as Vitest `include`; filters and `--changed` intersect it; non-literal tags → file included.
- Spec extraction and comparison logic unchanged.
- Auto-triage by code where deterministic (harness: capture blocked / size differs; token: colour equals another kit token; value: spec number off), written to results JSON and report.
- Target: warm run of 4 stories / 180 cells ≤ 25 s wall; per-cell afterEach ≤ 150 ms; timings reported, not gated.

### Variables
- No non-Enterprise REST route for variable id → name. Names come from the Plugin API via `use_figma`, run by an agent in session, incrementally for new ids; `figma-qa variables` prints the script and merges results into committed `variables.json`.
- CI reads committed names; unnamed ids → value-match fallback labelled as guess, one warning line.

### Project config
- Optional `figma-qa.config.ts` via `defineConfig`: `tokens.prefix` (default `--color-`), `tokenName(variable)` (default kebab of full path + prefix; null/miss → value match), `icons { glob, name }` (default glob `src/icons/*.svg`, inside the project; default name = kebab of last segment), `refsDir` (default `figma-qa/__refs__`), `maxDiffRatio` (default 0.05; stories override). Unknown keys → error, exit 2.
- Tokens read at runtime from preview CSSOM with `var()` aliases resolved. Icons via a kit Vite virtual module, SVGs loaded `?raw`; cells render them with `FigmaIcon`, identity matched by SVG geometry. No icons found → glyph-less cells + doctor warning.
- Config file exposed to the preview through a virtual module (functions run in preview); CLI loads it with Vite `loadConfigFromFile`.
- Not config: backdrop (derived from computed background), QA UI theme (kit-owned, dark), pointer-state pins (story-owned class maps), file keys, CI, Docker.

### init and wizard
- Project states: no Storybook → official `storybook init` for react-vite (latest 10; `--next` → 11 beta), then merge. SB 10.6+ / 11 → merge. SB < 10.6 → refuse, point at `storybook upgrade`. Non React + Vite → refuse naming what was found. Adds `@storybook/addon-vitest` via `storybook add` only when missing.
- Merge: `main` addons += kit; CSF Next preview → kit addon in `definePreview({ addons })`; Vitest config += kit project. Unsafe shapes → print exact snippet, exit 2.
- Skills: `DISABLE_TELEMETRY=1 npx -y skills@<pinned> add ./node_modules/@phenomenon-studio/storybook-figma-qa/skills --copy -y -a claude-code codex` (explicit `-a`: with no agent detected the CLI writes ~55 agent dirs); on kit version / hash change init re-runs it (re-run is a no-op when unchanged). Spike 02 confirmed local-path add; no fallback needed.
- Rules: marked block `<!-- figma-qa:start -->…<!-- figma-qa:end -->` in `AGENTS.md`, also `CLAUDE.md` when it exists without `@AGENTS.md`; only content between markers is rewritten.
- Every step detects before acting; re-run is a no-op; `--dry-run` prints the plan. Never touches stories, components, tokens, manager theme, other Vitest projects, git, CI files.
- Wizard = doctor checks (ok / missing / blocked + human fix), in order: registry → Figma token → file access → Docker / image → variables-naming info.
  - Registry: never prompted; project `.npmrc` gets only `@phenomenon-studio:registry=https://npm.pkg.github.com`; token stays in user `~/.npmrc` (docs: `gh auth refresh -s read:packages`, fallback classic PAT with `read:packages`).
  - `FIGMA_TOKEN`: prompted; validated with `GET /v1/me` and, when a Figma story exists, `/meta` on its file; written to `.env.local` only if `git check-ignore` confirms ignored, else refuse and print the line.
  - Docker: detect only; present → Y/n pull pinned image; absent → host-fallback info.
  - Figma MCP: info line only.
  - `--yes` / non-TTY: no prompts, no secrets, no pull; checklist; exit 0.
- Final checklist prints the CI caller snippet.

### scaffold
- `figma-qa scaffold <url...> --story <path>`: any node URL (page, section, frame, set), repeatable; collects every `COMPONENT_SET` beneath.
- Writes / edits only the kit-owned sibling `<Component>.figma.stories.tsx`: meta title = sibling story's meta title + `/Figma` (static read; fallback path-derived), `tags: ['figma', '!autodocs']`, `component` imported via the sibling's import path.
- Entry names: last `/` segment of set name, component prefix stripped, kebab-case; collisions → numeric suffix + warning. No code introspection in v1.
- Layout: `columns` = `State` if present else axis with most options; `sections` = `Size` if present and ≠ columns, else null.
- Each block's `renderCell` stubbed to return null with a TODO.
- Re-run appends sets not already linked (match by file key + node id); never renames, reorders or removes; vanished sets → warning. `--dry-run` prints the diff.
- Requires live `FIGMA_TOKEN` (exit 2 + wizard hint otherwise); its `/nodes` fetch warms the refs cache.
- The `.figma.stories.tsx` suffix is a scaffold convention, not a discovery key.

### Agent skills
- Code over prose: skills call CLI commands and keep only judgment. One entry point: scope → `figma-qa report --json` → read per-story results JSON → triage deliberate-vs-fix → act (fix code, or add an approval to the story for human confirmation; no AST `approve` command).
- Scaffold follow-up skill: rename entries to real code variants, write `renderCell` bodies.
- Variable naming skill: run the printed Plugin API script via `use_figma`, feed output to `figma-qa variables`.

### GitHub Actions
- Reusable workflow `Phenomenon-Studio/storybook-figma-qa/.github/workflows/figma-qa.yml@v1`; kit repo Actions access = organization repositories.
- Consumer: every `pull_request`, `fetch-depth: 0`, `figma-qa report --ci --changed <base.sha>`; optional `paths` input, default empty. Browser = `services:` container with kit-pinned Playwright image (`run-server` on :3100). `FIGMA_TOKEN` per-repo secret passed explicitly; missing → job skipped with notice. Registry via `GITHUB_TOKEN` `packages: read` + package "Manage Actions access".
- Exit 1 and 2 both fail the job; not a required check in v1.
- One sticky comment (marker `<!-- figma-qa -->`) created / updated via `gh api`; body = `--ci` summary (per-story pass / fail / approved, triage category, artifact link; harness errors labelled "not a design verdict"; 401/403 → rotate-secret message; nothing affected → "no Figma stories affected"). `pull-requests: write`.
- HTML report artifact, `if: always()`, 14-day retention.
- Kit repo CI: matrix `fixtures/sb10` × `fixtures/sb11` on Node 22.12 + current LTS; `init --yes` then offline `report` against committed fixture refs + recorded Figma responses; nightly live job with a token. Publish on Release `published`: `npm publish` with `GITHUB_TOKEN` `packages: write`, prerelease → `--tag next`, move `vN` tag.

### Migration of this repo
1. Build the kit in the org repo, seeded from the in-tree pipeline; this repo untouched.
2. Publish `0.x` when the fixture run passes.
3. Parity: kit report on this repo's 4 Figma stories matches the in-tree report (same cells, same verdicts).
4. One cutover PR: registry scope line + `init`; stories move to sibling `<Component>.figma.stories.tsx` with `parameters.design` entries + `figma` tag; delete in-tree Figma pipeline incl. the set registry; `git mv` refs to `figma-qa/__refs__`, `--refresh` if refs format changed; drop `pnpm vrt figma`; old `figma-matrix` skill replaced by kit skills. DIY / Argos / Chromatic experiments untouched.

## Testing Decisions

- A good test exercises external behaviour only: exit codes, stdout JSON, written files, rendered UI. No tests on internal modules (spec extraction, layout, diff map, triage) unless a fixture cannot reach a branch.
- **Seam 1 (primary): the `figma-qa` CLI against fixture projects.** Run the real binary in `fixtures/sb10` and `fixtures/sb11`: `init --yes` (files merged, `AGENTS.md` block, `.npmrc` scope line, skills installed; re-run produces no diff; `--dry-run` writes nothing; refusal cases exit 2), `doctor`, `report --json` (exit 0 / 1 / 2, summary, per-story results JSON with cells, triage categories, timings), `scaffold` (generated file, append-only re-run, `--dry-run` diff), `variables` merge, `migrate`. Fixtures carry deliberate pass, fail, approved, missing and misconfigured cases plus a non-literal tag case.
- **Figma REST double at the network edge** (not a new seam): the CLI's overridable Figma base URL points at a local stub serving recorded `/meta`, `/nodes`, `/images` responses. Covers unchanged-version zero-call path, changed-version per-set re-render, offline / no-token cache path, uncached-set exit 2, 401/403 and 429 handling. The nightly job hits live Figma.
- **Seam 3: results model → Storybook panel and HTML report.** Stories for the panel and report fed fixed results JSON (pass, fail, approved, harness error, host-browser banner, Figma-changed warning) with play functions + axe, run by Vitest browser tests.
- Prior art: this repo's Storybook Vitest browser project (`test:storybook`: play functions + axe), the in-tree Figma matrix stories for Button / Checkbox / Radio / Badge, and the profile prototype's phase timers for timing assertions in `--json`.
- Parity check (migration step 3) compares kit vs in-tree verdicts on the 4 real stories; it is a one-off acceptance gate, not a permanent test.
- Speed target (≤ 25 s) is measured and reported, never asserted in CI.

## Out of Scope

- Frameworks other than React + Vite (Next.js etc.) and Storybook < 10.6; a new adapter is a new effort.
- Hosting the designer-facing HTML report (Pages / S3 / Chromatic); v1 serves designers via CI artifact and local open.
- Designer self-service runs without a dev environment.
- Enterprise-only Figma REST variables endpoints.
- a11y checks in the Figma report.
- An AST-rewriting `approve` command; approvals stay agent edits confirmed by a human.
- Sharding, per-block capture, cold `--refresh` optimisation beyond the decided call pattern.
- Code introspection (cva keys) for scaffold entry names.
- Pseudo-state forcing mechanism in the kit; pointer-state pins stay story-owned.
- Making the PR check a required status check (repo owner's call).
- The DIY / Argos / Chromatic VRT experiments in this repo.

## Further Notes

- Detail and sources for every decision live in the resolved tickets of [Figma QA standard](../figma-standard/map.md); research write-ups under `../figma-standard/research/`.
- Vocabulary follows `GLOSSARY.md`: Spec extraction, Comparison, Pixel diff, Figma report, Figma story, Cell, Block, Approval, QA kit, UI kit.
- Spikes to run early: `npx skills add` from a local package path; magicast merge of a CSF Next `definePreview` file on SB 11 beta.
- Risks: SB 11 beta churn (internal AST API, `storybook/test` absent in manager); Node 22.12 / Vite 6.3 floors for consumers; GitHub Packages requiring auth even for installs, including `dlx init`.
