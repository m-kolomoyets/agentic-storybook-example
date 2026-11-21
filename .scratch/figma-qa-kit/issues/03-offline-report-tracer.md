# 03: Offline report tracer

**What to build:** In a fixture, a Figma story with one component set (one named `figma` entry in `parameters.design`, the `figma` tag, one matrix block referencing the entry by name) is checked end to end from committed refs: `figma-qa report --json` runs Vitest, each cell is held to its Figma variant by spec extraction + comparison (ported from the in-tree pipeline) and by a pixel diff done in Node from one screenshot per cell, results are written per story, and the exit code reflects the verdict.

**Blocked by:** 01 Kit repo skeleton + tracer CI

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Fixture refs committed under the default `refsDir`; run needs no token and no network
- [ ] Cells derived from manifest variants + block `layout`, stamped `data-figma-variant`; author writes only `renderCell(props)`; variant with no code equivalent → `data-figma-missing`, not a failure
- [ ] One `page.screenshot` per cell sent to Node command `figmaPixelDiff`; no `toMatchScreenshot`, no second screenshot
- [ ] Per-story results JSON written; `--json` prints the run summary on stdout
- [ ] Exit 0 when all cells pass/approved/missing; 1 when a fixture cell deliberately differs; 2 for a `figma`-tagged story lacking a `figma` design entry or matrix
- [ ] Story-level `approved` entries honoured (cell still measured, verdict approved)
- [ ] Fixture covers pass, fail, approved, missing and misconfigured cases; CLI tests assert exit codes + results only
