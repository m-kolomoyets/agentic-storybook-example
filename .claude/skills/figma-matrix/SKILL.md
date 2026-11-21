---
name: figma-matrix
description: Holds kit components to their Figma component sets through FigmaMatrix stories and `pnpm vrt figma`. Use when a component in src/components/ui is added or changed, when the Figma kit changed, when asked whether a component matches Figma, or when Figma cells fail.
---

# figma-matrix

Work from `storybook-mcp/`. The system, its philosophy and the story-writing rules live in [`visual/FIGMA-TESTING.md`](../../../visual/FIGMA-TESTING.md): read the section a step names, when it names it. This skill is the procedure.

Leading words:

- **cell**: one Figma variant rendered by code (`[data-figma-variant]`), status `pass` / `fail` / `approved` / `missing`.
- **spec value**: the number Figma stores (size, radius, fill, font, glyph box). Spec values outrank pixels: a pixel percentage says a diff exists, a spec line says what it is. Text is judged by spec only; pixels mask it.
- **drift**: any cell where code and Figma disagree.
- **approval**: drift recorded as deliberate, in the block's `approved` list, with a reason naming the WCAG criterion or decision. A human confirms every approval.

## 1. Preflight

Run `pnpm vrt figma --doctor`. It checks Figma access, cache, version drift, sets without stories, browser and Storybook, and ends on a mode:

- **full**: continue.
- **offline** (no usable token, cache complete): continue for registered sets. A new set or adopting a Figma change needs access: give the user the doctor's fix line and let them put `FIGMA_TOKEN` in `.env.local` themselves; the token stays out of chat.
- **blocked**: stop and report the doctor's fix lines.

Browser line `!` → run with `--host-browser` and say the numbers come from local Chromium. A Figma MCP server (`get_screenshot`, `get_design_context`) can show a node during triage; the matrix itself always comes from the synced cache.

**Done when** the mode is known and every `✕`/`!` line that affects this run is fixed or listed for the user.

## 2. Scope

Pick every branch that applies:

- **New component**: a Figma set exists (doctor, or the report's _Kit coverage_) and no FigmaMatrix block renders it → step 3.
- **Component changed**: `git diff` touches `src/components/ui/<Name>/` → that component's `FigmaMatrix` story, plus every other matrix whose `renderCell` renders it.
- **Figma changed**: doctor says _Figma changed since sync_ → step 4.
- **Question or failing cells** → step 5.

**Done when** each component in scope is listed with its sets and matrix story, or as `unpaired` with the reason (no Figma set, no code component).

## 3. Write or extend the matrix

Register the set in `visual/figma/sets.ts`, run `pnpm vrt figma` to sync it, then write the block as [FIGMA-TESTING.md → Starting a component](../../../visual/FIGMA-TESTING.md#starting-a-component) shows.

Mapping legwork, per block: read the set's `axes` in `visual/figma/__refs__/<file>-<node>/manifest.json`, the component's `types.ts`, and its `Matrix` story's `FORCED` pins. Every option of every axis maps to props or returns `null` on purpose. Read the component's `utils/variants.ts` comments for deviations already documented against Figma: they are approval candidates for step 6.

**Done when** every axis option is mapped or listed as intentionally `null`, and `pnpm tsc` passes.

## 4. Adopt a Figma change

`pnpm vrt figma --refresh`, then summarise `git diff visual/figma/__refs__` per set: variants added or removed, spec values that moved (size, radius, fill, text). New variants enter the matrix through step 3's mapping.

**Done when** every changed set has a one-line summary of what moved in Figma.

### Variables

When a sync warns `N bound Figma variables have no name` (new bindings after a refresh or a new set), name them; rows show those by id until then. The REST variables endpoint is Enterprise-only, so names come from the Plugin API:

1. `pnpm vrt figma --variables-script` prints a read-only script for the unnamed ids.
2. Run it with the Figma MCP `use_figma` on file `GPPlxspxcbP4kc13YwNJTH` (load `figma-use` first; it only reads `figma.variables`).
3. Save the returned `lines` value verbatim to a scratch file, then `pnpm vrt figma --variables <file> <fnv>` with the returned `fnv`. A checksum mismatch means the lines changed in transit: copy them again, never edit them.

**Done when** the sync prints no unnamed-variables warning and `visual/figma/__refs__/variables.json` is updated.

## 5. Run

`pnpm vrt figma`, then MCP `test-run` on the touched stories (play functions and axe; the Figma run doesn't cover a11y).

**Done when** `visual/.results/figma/results/<storyId>.json` exists for every in-scope story and `test-run` is green.

## 6. Triage and act

Classify every `fail` cell with [TRIAGE.md](TRIAGE.md). Then:

- **mapping / harness**: fix the story or tooling yourself; re-run.
- **value / token / structure / behaviour**: fix the component or token when the user asked for fixes; otherwise report it with the owning file and line.
- **deliberate** (a code comment, ADR or design decision explains it): propose an approval with the reason; add it once the user confirms.

Re-run after each fix. Tolerances stay as they are: text is masked from pixels and has its own allowance, so a cell over `maxDiffRatio` is a fill, stroke, shadow or glyph difference to explain.

**Done when** every `fail` cell is fixed, reported with an owner, or proposed for approval.

## 7. Report

```
## <Component> · <story id> · <pass>/<compared> match · <approved> approved · <missing> no code
| Cell | Class | Spec value (Figma) | Rendered | Owner (file:line) | Action |
Proposed approvals: <cells> — <reason>
No code equivalent: <cells>
```

Rank rows structure → behaviour → value → token → mapping → harness. End with the report path (`visual/.results/figma/index.html`), the Storybook story to open (Figma diff tab), and any doctor lines still open.
