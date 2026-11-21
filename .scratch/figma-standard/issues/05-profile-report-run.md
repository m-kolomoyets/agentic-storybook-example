# Profile a Figma report run

Type: prototype
Status: open
Blocked by: 01

## Question

Last runs: 63–88 s for 4 stories (`visual/runs.jsonl`). Suspects: sequential per-cell work in one `afterEach` (canvas flatten, `figmaSaveFlatRef` rewrite every run, `toMatchScreenshot` retrying to 1.5 s timeout on differing cells, second `page.screenshot`, `explainPixels` re-decode), diff map computed 3× (setup.ts, panel/FigmaMatrix, report.ts), results JSON fetched by two QueryClients. Instrument a run (throwaway branch), produce a time breakdown per phase (sync, fetch, per-cell spec, pixel, report), and react to it with the human: which costs to cut.
