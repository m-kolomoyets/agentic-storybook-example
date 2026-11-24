# 05: Results model → panel + HTML report

**What to build:** Developers see results in the Storybook "Figma diff" panel and designers in a standalone HTML report, both rendering the same results model. The diff map is computed once in Node when results are written.

**Blocked by:** 03 Offline report tracer

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] Diff map computed once in Node and persisted in results JSON; panel and report only render it
- [x] Manager panel reads results through one shared QueryClient; works on Storybook 10 and 11 fixtures
- [x] HTML report directory written per run
- [x] Stories for panel + report fed fixed results (pass, fail, approved, harness error, host-browser banner, Figma-changed warning) with play functions + axe; all pass
- [x] Report and panel show identical verdicts for the same results

## Answer

Done 2026-11-24 in `Phenomenon-Studio/storybook-figma-qa` `main`, commits `4976ac6` and `a6c3d17` (dev route guard) (not pushed yet, so no CI run). Typecheck is green on the kit and both fixtures. `pnpm test` passes 85/85: new `test/results-model.test.ts` runs the CLI in `fixtures/sb10` and `fixtures/sb11`, and the new `ui` Vitest project runs the panel and report stories with play functions and axe. `pnpm smoke:panel --dev fixtures/sb10|sb11` passes: after a report, `storybook dev` shows the CLI's verdict in the panel, the diff map image loads from the dev route, and the canvas renders the matrix. Static builds and the static panel smoke pass on both.

Decisions later tickets need:

- **Diff map in Node.** `node/diff-map.ts` classifies each differing pixel during `figmaPixelDiff`. The cell's `image` gains `classes` (`figma` / `story` / `colour` / `masked`, at 2x), `pair` (the dominant colour change as hex), and `blob` (largest region in CSS px; the browser names the element at its centre with `pathFrom`). `-diff.png` is now the classified map, not pixelmatch's raw diff. The verdict still counts pixelmatch's own mismatches. "Drawn" is measured against the reference's border ring, unless that ring itself changed (a full-rectangle fill that changed colour); then the page backdrop is used, so a changed fill reads as a colour change. Ticket 10's token triage can build on `pair`.
- **Run model.** `FigmaRunSummary` (types.ts) is the `--json` summary, now also written to `figma-qa/.results/run.json`. It gains `hostBrowser`, which is always `true` for now because every run uses host Chromium. Ticket 08 sets it from the browser it picks and adds the summary warning. `.results` is wiped at the start of every run, before config checks, and `run.json` plus the report are written even when setup fails, so neither the panel nor the report shows a stale run.
- **One verdict source.** `figma/verdict.ts` (`countCells`, `storyVerdict`, `runExitCode`) is used by the CLI, the panel and the report.
- **HTML report.** `figma-qa/.results/report/index.html` plus `files/<project path>` copies of every image, so the directory stands alone (the CI artifact for ticket 11). It has no script. `react-dom/server` renders the same `src/ui` components the panel uses and loads lazily in `report`. **New peer `react-dom ^18 || ^19`**; spec updated.
- **Panel.** `@tanstack/react-query 5.107.1` is a new dependency, bundled into the manager. There is one module-level `QueryClient`, passed to each `useQuery`: `QueryClientProvider` renders through `react/jsx-runtime`, which SB 10's manager doesn't share. The panel shows the selected story's results, falls back to `run.json` for a story that wrote none (render failure), and says so for non-Figma stories and when there are no results.
- **Dev route** (preset `viteFinal`, `DEV_ROUTE = /__figma-qa`):
  - `GET files/<project path>` serves only PNG/JSON under `refsDir` and `.results`.
  - `POST sets` feeds the preview loader in a running Storybook, as ticket 03 asked. It is **offline** (`SyncPaths.offline`): only a report run calls Figma or writes refs, and an uncached set shows its error in the canvas.
  - The route runs before Vite's host and CORS checks, so it makes its own: Host must be local, an IP or in Vite's `allowedHosts`; `Sec-Fetch-Site` must not be cross-site; POST must be JSON; bodies capped at 64 KiB.
  - In a static build the loader finds no route and the matrix says refs load in a run or in `storybook dev`.
- **UI stories.** The kit has its own Storybook (SB 10.6, dev only) in `packages/storybook-figma-qa/.storybook` and `stories/`. It covers pass, fail, approved, harness error, render failure, host-browser banner, Figma-changed warning, no results and non-Figma story, plus a story where panel and report agree on every verdict. SB 11 coverage of the UI comes from `smoke-panel --dev`.
- **Not ported from the in-tree panel:** cell selection synced with the matrix, the compare overlay, the lightbox, live a11y rows and the fix prompt. The spec keeps a11y out of the report; the rest is out of scope until asked for.

