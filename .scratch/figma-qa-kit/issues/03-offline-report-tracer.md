# 03: Offline report tracer

**What to build:** In a fixture, a Figma story with one component set (one named `figma` entry in `parameters.design`, the `figma` tag, one matrix block referencing the entry by name) is checked end to end from committed refs: `figma-qa report --json` runs Vitest, each cell is held to its Figma variant by spec extraction + comparison (ported from the in-tree pipeline) and by a pixel diff done in Node from one screenshot per cell, results are written per story, and the exit code reflects the verdict.

**Blocked by:** 01 Kit repo skeleton + tracer CI

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] Fixture refs committed under the default `refsDir`; run needs no token and no network
- [x] Cells derived from manifest variants + block `layout`, stamped `data-figma-variant`; author writes only `renderCell(props)`; variant with no code equivalent → `data-figma-missing`, not a failure
- [x] One `page.screenshot` per cell sent to Node command `figmaPixelDiff`; no `toMatchScreenshot`, no second screenshot
- [x] Per-story results JSON written; `--json` prints the run summary on stdout
- [x] Exit 0 when all cells pass/approved/missing; 1 when a fixture cell deliberately differs; 2 for a `figma`-tagged story lacking a `figma` design entry or matrix
- [x] Story-level `approved` entries honoured (cell still measured, verdict approved)
- [x] Fixture covers pass, fail, approved, missing and misconfigured cases; CLI tests assert exit codes + results only

## Answer

Done 2026-11-21 in `Phenomenon-Studio/storybook-figma-qa` `main` `1bf9059` (not pushed yet, so no CI run). Typecheck green on kit + both fixtures; `pnpm test` 10/10 (`report --json` exit 0 / 1 / 2 in `fixtures/sb10` and `fixtures/sb11`); Storybook build + panel smoke green on both.

Decisions later tickets need:

- **Kit Vitest entry** = project factory `figmaQa()` from `./vitest`, appended to `test.projects` (closes the ticket 02 open point). Project name `figma-qa`; `report` runs only that project via `startVitest`, so it reads the user's Vitest config. Factory composes `storybookTest({ tags: { include: ['figma'] } })`, Playwright Chromium at DPR 2, kit setup file, commands `figmaEnsureSets`, `figmaPixelDiff`, `figmaSaveStoryResult`.
- **New peers**: `@storybook/addon-vitest ^10.6.0 || ^11.0.0-0`, `@vitest/browser-playwright ^4 || ^5`. Deps: `pixelmatch 8`, `pngjs 7`. Kit AGENTS.md + spec updated.
- **Refs reach the story through a preview loader**, not a virtual module: the `figmaQa()` preview addon has a loader that, for `figma`-tagged stories, calls a hook the Vitest setup installs (`globalThis.__figmaQaLoadSets` = `commands.figmaEnsureSets`) and puts `{ blocks, variables }` or `{ error }` under `loaded.figmaQa`. Outside a run (Storybook UI) there is no hook and `<FigmaMatrix>` says so: ticket 05's dev route must feed the loader there. `afterEach` calls `figmaEnsureSets` again: ticket 04 should reuse or coalesce.
- **Story API**: `<FigmaMatrix context={context} renderCell={fn | { [entryName]: fn }} />`, exported from `./preview` with the parameter types; `renderCell(props, variant)`. Block resolution (`figma/story.ts`) is shared by loader and checks.
- **Results**: `figma-qa/.results/` (gitignore it; init's job): `results/<storyId>.json` + `<storyId>-<variant>-actual.png` / `-diff.png`; wiped at the start of every run. Story result has `error: string | null`; any story error (misconfigured, uncached set, render failure) → exit 2. `--json` summary: `{ exitCode, cells, stories[{ storyId, title, name, file, verdict, cells, error, results }], errors }`; stdout holds only that (console.log rerouted to stderr during the run).
- **All cells missing** in a block (stubbed `renderCell`) → story error, exit 2: scaffold stubs fail visibly.
- **Approvals never cover a cell whose image couldn't be measured** (capture blocked, sizes differ): it stays `fail`. In-tree approved those; ticket 10 should classify them harness.
- **Pixel diff in Node**: ref flattened onto the computed `html` background (transparent → white), text masks painted on whole device pixels on both images, pixelmatch threshold 0.1, ratio over unmasked area. Not yet pipelined or memoized (ticket 09).
- **Vitest 4 gotcha**: it scales the story iframe to fit the page; addon-vitest sizes it 1200×900, so the Playwright page is 1600×1200, else screenshots come out ~0.8× the refs.
- **Ported-but-unspecified matrix keys** kept: `figmaMatrix.maxDiffRatio` and `figmaMatrix.ignore` (spec rows dropped by property/element).
- **Tokens** read from `document.styleSheets` (`--color-` prefix, `var()` aliases resolved); default `tokenName` = kebab of full variable path. Icon identity check is stubbed off until the `icons` config (ticket 06).
- Filters are Vitest file filters for now (`report Swatch.figma`); ticket 08 owns component / story-id globs. Fixture refs come from `scripts/fixture-refs.mjs` (synthetic `Swatch` set, file key `FIXTUREKIT`).
