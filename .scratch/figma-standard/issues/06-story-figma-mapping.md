# Story → Figma mapping via parameters.design

Type: grilling
Status: resolved
Blocked by: —

## Question

Direction settled: the story's `parameters.design` is the single source; `sets.ts` duplication goes. Open shape: stories covering several component sets (`figmaMatrix.blocks[]`), multiple files per story, how variant cells bind to node IDs (`data-figma-variant`), how addon-designs' Design panel and the pipeline share one value, and how the run discovers which stories to check (tag `figma` vs presence of `parameters.design`).

## Answer

Grilled with the human, 2026-11-21. Facts: today a set URL is written 3× (`visual/figma/sets.ts` for node-side sync, `figmaMatrix.blocks[].set`, `parameters.design`); 48 story files carry `design` links (mostly frames/pages), only 4 are `figma`-tagged matrices; story URLs are template strings, so static scanning can't resolve them.

1. **Authoring**: `parameters.design` (addon-designs array of named `figma` entries) is the only place a set URL is written. `figmaMatrix.blocks[]` reference an entry by `name` and carry only extras (`layout`, `approved`); a single-set story's block may omit the reference. `sets.ts` / `FIGMA_SETS` go away.
2. **Entry names** = code variant names (`primary`, `secondary-elevated`), also the Design panel tab labels; survive Figma set renames.
3. **Link granularity**: one `design` entry per component set (explicit), not the component's UI-kit page. Enumerating a page's sets is at most a scaffolding aid (agent/CLI writes the entries), never run-time discovery.
4. **Discovery**: the `figma` tag (name kept). A tagged story without a `figma` design entry or without `figmaMatrix` is a hard error. `design` alone (frames, pages) is never checked.
5. **Sync without a registry**: lazy. Before its checks each Figma story calls browser command `figmaEnsureSets(urls)`; node coalesces concurrent calls per fileKey in a short window (≈ one `/nodes` per file, per the Figma REST fetch decision), then serves from cache. No Node pre-pass, no generated registry.
6. **Offline / no token**: use the committed cache; fail only a set with no cached refs ("set X not cached; run with token"). CI without a token runs off the cache.
7. **Files**: designers keep a UI-kit pattern — one kit file, one page per component with all its states. One file is the norm but not enforced (fileKey comes from each URL), so the project config needs **no file-key list**.
8. **Cell binding** stays derived: manifest variants laid out by `layout`, stamped `data-figma-variant` by `FigmaMatrixGrid`; authors write only `renderCell(props)`; no code equivalent → `[data-figma-missing]`.

Glossary: added **Figma story**, **Cell**, **Block** to `storybook-mcp/GLOSSARY.md`.
