# Profile a Figma report run

Type: prototype
Status: resolved
Blocked by: 01

## Question

Last runs: 63–88 s for 4 stories (`visual/runs.jsonl`). Suspects: sequential per-cell work in one `afterEach` (canvas flatten, `figmaSaveFlatRef` rewrite every run, `toMatchScreenshot` retrying to 1.5 s timeout on differing cells, second `page.screenshot`, `explainPixels` re-decode), diff map computed 3× (setup.ts, panel/FigmaMatrix, report.ts), results JSON fetched by two QueryClients. Instrument a run (throwaway branch), produce a time breakdown per phase (sync, fetch, per-cell spec, pixel, report), and react to it with the human: which costs to cut.

## Answer

Prototype: branch `prototype/profile-report-run` @ `17807f9` (never merge). `[prof]` timers in `visual/run.ts` + `visual/figma/setup.ts` afterEach; breakdown in `visual/.prototype/PROTOTYPE-profile.md`, raw log `PROTOTYPE-prof-run1.log`.

Measured (warm cache, Docker browser, 4 stories / 180 cells, 56.7 s wall):
- Sync + catalog + variables check 0.1 s; report 0.4 s (diff map 3× is negligible).
- Vitest start → first test ~16 s (28 %): all 60 story files collected, 4 used.
- Tests ~39 s: 4 files parallel; Button (108 cells, afterEach 37.4 s) is the critical path, others ~11–12 s.
- Per afterEach: `toMatchScreenshot` ~60 % (≈190 ms matching / 350 ms differing cell — no 1.5 s timeouts), second `page.screenshot` ~28 %, flatten + `figmaSaveFlatRef` 5–8 %, spec/explain/saveResult < 2 %.

Decided with the human (2026-11-21):
- Cut: **one capture per cell** (drop `toMatchScreenshot` + second screenshot; single `page.screenshot`, own pixelmatch), **trim Vitest startup** (collect only figma-targeted story files), **cache flat refs** (skip flatten/save when inputs unchanged).
- Not now: one capture per block (cropping); sharding big matrices — re-profile after capture cuts first.
- Scope: optimize the warm run only; cold `--refresh` fetch is covered by the Figma REST fetch decision.
