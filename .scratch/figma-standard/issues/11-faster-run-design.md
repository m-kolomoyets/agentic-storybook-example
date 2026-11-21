# Faster Figma report run: fetch + comparison design

Type: grilling
Status: resolved
Blocked by: 02, 03, 05

## Question

Combine findings from 02 (variables), 03 (REST semantics), 05 (profile) into decisions: call pattern (`depth`, batching, cache key, change detection), what is cached and where (committed `__refs__` vs CI cache), which comparison work is parallelised, deduplicated (one diff-map computation) or dropped, and a target run time for N stories.

## Answer

Grilled with the human, 2026-11-21. Builds on the Figma REST fetch decision (call pattern, `/meta` `version` cache key, per-set subtree hash) and the Profile decision (one capture per cell, collect only Figma stories, cache flat refs; warm run only).

- **Committed vs local**: committed `refsDir` stays source of truth (variant PNGs, per-set manifest, `catalog.json`, `variables.json`) so offline / no-token CI works. Per-set manifest gains the subtree hash + file `version`, so anyone detects "Figma changed since sync" without refetching. Raw `/nodes` JSON and flat refs live in gitignored `node_modules/.cache/figma-qa/`.
- **CI cache**: nothing Figma-specific (refs are committed); only pnpm store + pinned browser image.
- **Pixel diff in Node**: browser takes one `page.screenshot` per cell and sends it to a Node command (`figmaPixelDiff`); Node flattens the ref once per (ref hash, backdrop), memoized in memory + disk cache, then pixelmatches. Replaces `figmaSaveFlatRef` and browser canvas flatten.
- **Pipelining**: capture cell N, fire Node diff unawaited, move to N+1; the story awaits all diffs at the end. File-level Vitest parallelism kept; no sharding, no per-block capture.
- **One diff map**: computed once in Node when results are written, persisted in results JSON; panel and HTML report only render it. Panel reads results through one shared QueryClient.
- **Collect only Figma stories**: CLI statically scans story files for a `figma` tag literal and passes the list as Vitest `include`; filters / `--changed` intersect it. Non-literal tags → file included (over-collect, never miss).
- **Spec extraction / comparison**: unchanged (< 3 % of run).
- **Target**: warm run of the current 4 Figma stories (180 cells) ≤ 25 s wall (from 56.7 s); per-cell afterEach ≤ 150 ms. Phase timings in `--json` and the report; no CI gate on time.
