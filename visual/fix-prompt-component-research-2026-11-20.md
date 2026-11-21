# Figma fix prompt: component-anchored findings report (2026-11-20)

Follow-up to `visual/fix-prompt-research-2026-11-20.md` (not repeated here). New direction: the prompt targets the **component declaration** and the **Figma variant node**, reads as a **findings report** (what is wrong, where it lives, how to fix, what not to touch), and mentions the story only as verification context. **[fact]** = checked in the cited source. **[rec]** = recommendation. Paths are relative to `storybook-mcp/` unless they start with `node_modules/`.

## Verdict / summary

- **Feasible with small run-time captures.** The component file is already resolvable: Storybook's index stores `componentPath` per story (`./src/components/ui/Badge/index.tsx` for `ui-badge--figma-matrix`), and addon-vitest puts the raw component import on every test task. The Figma variant node id and set URL are already in each result. **[fact]**, see the next two sections.
- **The owning `cva` axis can be found statically**, at file and axis level reliably and at line level as a ranked candidate list. A read-only prototype (Method) parsed `badgeVariants`, `checkboxVariants` and `radioVariants` with the TypeScript API and pointed each finding at `variants.ts:<line>` plus the token's `tokens*.css:<line>`. Picking the axis value (`size.lg`) needs the code props each cell rendered with. Today that's only recoverable from ad-hoc `FIGMA_*` maps in stories. **[rec]** Capture it at render time instead.
- **The grouping must be by variant set, not by Figma axis.** In Badge, every `Size=Big` FAN-status cell fails at 24 px tall, while the three `Size=Big` chip cells pass at 30 px (manifest). Applying "fix `size.lg` once" would break the passing ones. A scope check (do other compared cells with the same props pass?) turns that into "check the mapping / missing variant" instead.
- **Prerequisite bug found: most Badge colour findings are comparator artifacts, not drift.** Figma's fill equals the token's declared value exactly. The "received" value is the canvas round-trip of a low-alpha colour. In Chromium 159, `getComputedStyle` returns `rgba(45, 204, 113, 0.1)`, and the canvas read gives `[49, 206, 118, 26]`. This affects 9 cells and both classifications: 8 cells print as "drift" and 1 as a "wrong token" (`surface-warning`). Fix the colour read before trusting the drift and wrong-token kinds in any prompt.
- Templates and real renders for Badge and Checkbox are below. Badge is 11.7 KB, against 13.2 KB for today's 16 per-cell prompts on the same results, and now includes rules, owners and Figma URLs. All three components together are 16.9 KB, against 19.8 KB for 30 prompts. Checkbox alone grows from 2.9 to 4.6 KB because of the fixed rules.

## 1. Resolving the component declaration

### What exists

| Source | Holds | Available when | Evidence |
| --- | --- | --- | --- |
| Storybook index entry | `importPath` (story file) and `componentPath` (resolved component file) | Dev server `/index.json` and `storybook-static/index.json` | **[fact]** Live `http://localhost:6006/index.json`: `ui-badge--figma-matrix` → `importPath ./src/components/ui/Badge/Badge.stories.tsx`, `componentPath ./src/components/ui/Badge/index.tsx` (same shape for Checkbox and Radio). The static build is stale: it has no `*--figma-matrix` entries, though its other entries carry `componentPath`. The indexer resolves `rawComponentPath` relative to the story file (`node_modules/storybook/dist/core-server/index.js:19131-19140`, `:19162`). The type is `StoryIndexEntry.componentPath?: string` (`node_modules/storybook/dist/chunk-TreilRja.d.ts:9094`). 438 of 582 stories have it |
| Vitest task meta (addon-vitest) | `meta.storyId`, `meta.componentName`, `meta.componentPath` | At run time, in `setup.ts`'s `afterEach` | **[fact]** `node_modules/@storybook/addon-vitest/dist/vitest-plugin/test-utils.js:125` sets all three. `componentPath` is the **raw import source** of `meta.component`, e.g. `'.'` (`node_modules/storybook/dist/csf-tools/index.js:566` → `_rawComponentPath`, which is `importStmt.source.value` at `_node-chunks/chunk-6HGKLOH7.js:898`). `setup.ts:161,271` already reads `storyId` and `componentName` |
| Browser command context | `testPath` (story file, absolute) and `project.vite` (a Vite dev server, so it has a resolver) | In `figmaSaveStoryResult` (Node) | **[fact]** `BrowserCommandContext { testPath; provider; project }` (`node_modules/vitest/dist/chunks/plugin.d.Du7hHZwb.d.ts:830-837`), `TestProject.vite: ViteDevServer` (same file :1103). Docs show `({ testPath, provider }) => …` and `project.config.root` (vitest.dev/api/browser/commands). `commands.ts:28-31` already takes `{ project }` |
| Results today | `storyId`, `title` (component name), `name` | Report and panel | **[fact]** `FigmaStoryResult` has no file fields (`visual/figma/types.ts:138-144`) |
| Story `meta.component` | `component: Badge` imported from `'.'` | Statically | **[fact]** `Badge.stories.tsx:7,30`, `Checkbox.stories.tsx:7,28` |

### Simplest reliable resolution **[rec]**

1. In `setup.ts`, pass `context.task.meta.componentPath` (raw, e.g. `'.'`) along with the result.
2. In `figmaSaveStoryResult` (Node), resolve it:
   - `storyFile = relative(root, testPath)`
   - `componentFile = relative(root, (await project.vite.pluginContainer.resolveId(componentPath, testPath))?.id)`

   Vite's own resolver handles `@/` and `index.tsx`. This is the same resolution the Storybook indexer does, but it needs no running Storybook and no stale `storybook-static`.
3. Store `source: { storyFile, componentFile }` on `FigmaStoryResult`.

Fallback when `meta.component` is absent: `componentFile: null`. The prompt then names the story file's imports as the place to look.

### Finding the owning `cva` axis statically

**[fact]** Convention: "extract variants with `cva` in `utils/variants.ts`" (`.claude/rules/code-style.md`, Styling). The repo has 10 `cva(` files, all `*/utils/variants.ts` (`grep -rl "cva(" src`). Badge, Checkbox and Radio import them from `index.tsx` (`Badge/index.tsx:7`, `Checkbox/index.tsx:8`, `Radio/index.tsx:6`).

**[fact]** Prototype (TypeScript 6.0.3 `createSourceFile`):

- Walks every `cva(...)` call and records each class with `{file, line, cvaName, axis, value}`. The base comes from arg 0 (string, template or array). The variants come from `arg1.variants.<axis>.<value>`.
- Also records string and template literals elsewhere in `index.tsx` and `utils/*`, e.g. `Badge/index.tsx:27` `size-l` (the mode-dot box).
- Each class is mapped to its token: `py-m` → `--spacing-m`, `bg-x` → `--color-x`, `text-x` → `--text-x` or `--color-x`, `rounded-x` → `--radius-x`. The token's `file:line` comes from `src/styles/tokens*.css`.

Results on the real components:

| Component | Axis owners found | Example |
| --- | --- | --- |
| Badge | base `variants.ts:9-13`, `variant.*` :19-28, `size.sm/md/lg` :32-35, literal dot `index.tsx:27` | `variants.ts:35 py-m (size.lg → --spacing-m)` |
| Checkbox | base colour chain `variants.ts:13-20`, `size.md/lg` :26-27 | `variants.ts:14 data-[checked]:text-icons-general-strong (base → --color-icons-general-strong)` |
| Radio | base `variants.ts:12-22`, `size.sm/md/lg` :27-29 | `variants.ts:29 size-2xl (size.lg → --spacing-2xl)` |

Reliability:

- **File: high.** One `cva` per component, imported from the component file.
- **Axis value: high, but only with the cell's code props.** In the prototype these came from regex over each story's `FIGMA_SIZE`/`FIGMA_TONE`/`FIGMA_MODE` maps (`Badge.stories.tsx:241-254`, `Checkbox.stories.tsx:209-215`, `Radio.stories.tsx:179-185`). That only works by convention, and `FIGMA_STATE` maps to a forced pseudo-state, not a prop.
- **Line: candidates.** A property family maps to a set of utilities: Height → `py-`/`size-`/`h-`/line-height, Font size → `text-<type>`. The prototype lists 1-8 candidates per finding, and for every non-pixel Badge finding the right one is among them. It can't tell which `px-`/`gap-` produced a 2 px text-offset error.
- **Pixel-only: none** beyond "the colour classes in the base".

**[rec]** Capture code props at render: the props of the first element in `renderCell`'s returned tree whose `type === context.component`. `StoryContext.component` exists per `StoryContextForEnhancers.component` (`node_modules/storybook/dist/chunk-DatIPI2b.d.ts:864-867`). It works for the wrapped renders too: `<CheckboxLabel><Checkbox size …/>` (`Checkbox.stories.tsx:236-251`) and `<RadioGroup><label><Radio size …/>` (`Radio.stories.tsx:189-206`) are static element trees. Store primitives only, e.g. `{ size: 'lg', variant: 'negative' }`. That replaces the `FIGMA_*` regex with data.

## 2. Figma reference

**[fact]** Fields:

- set: `FigmaBlockResult.set.url`, `.name` and `.version` (`types.ts:130-131`)
- variant: `FigmaCellResult.variant.id` (e.g. `12570:5990`), `.name` and `.props` (`types.ts:108-109`)
- file key and set node id: `FigmaSetManifest.source.{fileKey,nodeId}` (`types.ts:48`), also parsed from the URL by `parseFigmaUrl` (`sets.ts:25-34`)
- image paths: `cell.files.{reference,figma,actual,diff}` (`types.ts:127`)

**[rec]** Build a variant URL by swapping the `node-id` param on the set URL, which keeps the file-name segment that Figma MCP's URL parsing expects (`figma.com/design/:fileKey/:fileName?node-id=:nodeId`, Figma MCP server instructions):

```ts
const u = new URL(block.set.url); u.searchParams.set('node-id', cell.variant.id.replace(':', '-')); u.toString();
// https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=12570-5990
```

Also print `fileKey` and `nodeId` (colon form), so `get_design_context({fileKey, nodeId})` and `get_screenshot` can be called without parsing.

**[fact]** What stories already hold in `parameters.design`:

- `FigmaMatrix` stories: the set URL only (`Badge.stories.tsx:300`, `Checkbox.stories.tsx:227`)
- `meta`: the set (`Badge.stories.tsx:41`)
- `Matrix`: a handful of named per-variant URLs (`Badge.stories.tsx:183-190`)

None of these is per-cell, so the result data (not `parameters.design`) is the source for variant URLs.

**[fact]** Bound variables:

- Figma REST `Paint.boundVariables` is "A mapping of field to the VariableAlias of the bound variable". `VariableAlias` is `{ type: 'VARIABLE_ALIAS', id }`. The same field exists on `TypeStyle`, `Effect`, `LayoutGrid` and `ComponentProperty` (developers.figma.com/docs/rest-api/file-property-types/).
- Resolving `id` to a name through the Variables REST API needs an **Enterprise** plan, a Full seat and the `file_variables:read` scope (developers.figma.com/docs/rest-api/variables/).
- The sync keeps only `paint.color` (`figma-api.ts:70-80`, `solidFill`). The spec has no variable field (`types.ts:21-35`).

**[rec]**

- Capture `boundVariables.color.id` for root fill and text fill in the spec. It's free and on the same response.
- Show the variable name only when it can be resolved (Enterprise), otherwise the id.
- In the prompt, tell the agent to read names via Figma MCP `get_variable_defs` on the variant node. The tool returns variable definitions for a node; per its tool description it has no Enterprise gate.
- Until then, findings name the code token whose **declared value exactly equals** Figma's value, not the nearest one.

## 3. Finding → owner mapping, with worked examples

### Kind rules **[rec]**

Colour kinds only work after the comparator fix in section 6, step 1.

| Kind | Detect | Owner | Fix | Don't |
| --- | --- | --- | --- | --- |
| comparator artifact | Figma colour == declared value of the token the code uses | none | no change; report | don't touch component or token |
| wrong token | Figma colour == declared value of token T ≠ the token in use | the `bg-`/`text-` class in the cva axis value or base the cell renders with | swap the class to T's utility | don't edit token values |
| token value drift | code token is the nearest, no token equals Figma | the token line in the token file | report; the generated file is "Regenerate, do not hand-edit" (`tokens.css:1-2`) | don't edit the component, don't hardcode |
| no token for Figma value | nothing equals Figma, and the code token isn't the nearest | the cva class plus `tokens-supplement.css` | add a supplement token, use it | no literal value (code-style.md:53) |
| value (layout/type/radius) | numeric spec issue | `px-/py-/gap-/size-/text-<type>/tracking-/rounded-` in the axis value or base | change it to the scale step that gives the Figma value | no per-cell override, no `className` at the call site |
| structure | `Count`/`Presence` | component JSX, or the mapping when the caller passes the child | add or remove the element, or fix the mapping | — |
| pixel-only | fail, no mismatches (`view.ts:40-47`) | unmeasured; candidates are the base colour classes and glyph imports | compare the 3 images; name the owner or say "renderer noise" | don't raise tolerances |
| size mismatch | `image.error` with dimensions (`issues.ts:22-31`) | the root box classes | fix the box first | ignore pixel % until it compares |

### Comparator artifact: evidence

**[fact]**

- `spec.ts:227` reads `toRgba(rootStyle.backgroundColor)`, and `toRgba` paints on a 2D canvas and reads back bytes (`colors.ts:12-22`).
- Token values go through the same canvas (`colors.ts:56-79`), so code and token match each other ("= token") while Figma's exact bytes don't ("≈ token (Δ5)"). `isDrift` then flags the cell (`view.ts:162-167`).
- Chromium 159 probe (Playwright, Method):

| Declared | `getComputedStyle` | Canvas read |
| --- | --- | --- |
| `hsl(145.7 63.9% 48.8% / 0.1)` | `rgba(45, 204, 113, 0.1)` | `[49,206,118,26]` |
| `hsl(235 69.8% 83.1% / 0.1)` | `rgba(182, 187, 242, 0.1)` | `[186,186,245,26]` |
| `hsl(45 100% 65.5% / 0.06)` | `rgba(255, 211, 79, 0.06)` | `[255,204,85,15]` |

  The canvas reads are exactly the "received" values in `ui-badge--figma-matrix.json`. The declared tokens are `tokens.css:92` (`#2dcc71 @ 10%`), `:134` and `:340`.

### Worked examples (real results)

**Badge, F1: `Size=Big` FAN status (12570:5990 / 141270 / 141293).**

- **What's wrong:** height 24 → 30, font 12 → 10, line height 16 → 14, letter spacing 0 → 0.4, text offset 8 → 10, icon count 1 → 0. Updating also shows a background and ink mismatch.
- **Owners:**
  - `variants.ts:35` `lg: 'gap-xxs px-badge-px py-m'`
  - `variants.ts:11` `text-caption-s-medium tracking-[0.4px]` (base)
  - for Updating: `variants.ts:19` `neutral: 'bg-surface-control text-text-general-strong'`
- **But:** chip cells `Size=Big, State=Selected/Disabled` (10330:187048/198995/198999) pass at 30 px with the same `size: 'lg'` (`Badge.stories.tsx:254,276-281`).
- **Correct fix:** don't edit `size.lg` or the base type. Figma's Big FAN badge is a different design: 24 px tall, 12 px type, and its own fill (`--color-surface-fan-badge-updating`, `tokens-supplement.css:339`, which no Badge variant uses). So either add a code variant for it, or make `figmaBadge` return `null` for those states (`Badge.stories.tsx:256,264`) and report it as not in code.
- **Don't:** change `py-m`, `text-caption-s-medium` or `--spacing-badge-px`. They are shared by the passing chip and by `md`.

**Badge, F2: `Type=Mode, Leading=Dot` (11640:163194 …, 4 cells).**

- **What's wrong:** dot 14×14 → 12×12, so the text starts at 22 instead of 24.
- **Owner:** `Badge/index.tsx:27` `` cn`size-l ${MODE_DOT_ROUND} ${MODE_DOT[variant]}` `` (`--spacing-l` = 12 px, `tokens.css:590`).
- **Scope check clean:** every compared Mode/Dot cell fails the same way.
- **Fix:** a 14 px box. The precedent is `[&>svg]:size-[14px]` with "14px has no spacing step" (`variants.ts:12-13`); the rule says a missing value becomes a supplement token (code-style.md:53). Confirm first with `get_design_context` on 11640:163194 that Figma's 14 px is the dot and not a frame around a 12 px dot.
- **Don't:** touch `gap-xxs`/`px-m` in `size.md`, which nine passing cells share.

**Badge, `Tone=Warning` background (11633:162212).** Today it prints as a wrong token (`≈ --color-yellow-alpha-300-8` vs `= --color-surface-warning`).

- **Actually:** Figma `hsl(45 100% 65.5% / 0.06)` == `--color-yellow-alpha-300-6` (`tokens.css:340`) == `--color-surface-warning` (`:499`). A comparator artifact.
- **Fix:** none. Following today's prompt would swap `bg-surface-warning` (`variants.ts:22`) for a token 2 % more opaque.

**Badge, positive/info/cool/dry/custom/recondition backgrounds (8 cells).** Comparator artifacts, e.g. `--color-surface-tag-positive` (`tokens.css:505` → `:92`). Four cells (Info, Warning, Positive label, Positive metric) fail **only** because of this, so 4 of 16 Badge failures disappear once the read is fixed.

**Checkbox, F1: pixel-only, 6 cells** (Status ∈ {Checked, Indeterminate}, State ∈ {Default, Disabled}; 47.7-50.3 %).

- **Images:** Figma `refs/…-9183-5526.png` shows a dark box with a grey tick, while code `ui-checkbox--figma-matrix-9183-5526-actual.png` shows a solid white box with a dark tick. Checked by viewing both PNGs.
- **Candidate owners:** `variants.ts:14` `data-[checked]:text-icons-general-strong data-[indeterminate]:text-icons-general-strong` (→ `--color-icons-general-strong` = white-alpha-100, `tokens.css:446`), and the glyph SVGs `Checkbox/index.tsx:2-5,37-38`.
- **Note:** the file comment says "Selected … is white so a ticked row reads as ticked" (`variants.ts:4-5`). That looks like a deliberate deviation.
- **Correct outcome:** confirm in Figma (`get_design_context` 9183:5526). If deliberate, propose an `approved` entry for `Status: ['Checked','Indeterminate']` with the reason. If not, use Figma's checked fill token at `variants.ts:14`.
- **Don't:** recolour the SVG assets or raise `maxDiffRatio`.

## 4. Grouping

**[fact]**

- `repeatedRows` (`report.ts:316-369`) groups by `slotOf(element)|property|expected|received` across cells and collapses pixel-only cells per story. It works per issue and ignores axis scope.
- The `blockConclusion` the previous note cites (`issues.ts:150-154`) no longer exists: `issues.ts` is 55 lines, and only `cellConclusion` (`:34-55`) remains.
- The panel's per-cell prompt is at `figma-panel.tsx:449,632-647`. The report's copy-all prompts are at `report.ts:211-217` (per story) and `:905-928` (all stories).

**[rec]** Algorithm (prototyped):

1. **Issue groups.** Key: `kind | slotOf(element) | property | expected | received`. For pixel-only, `received` is dropped so the ratios merge. This is `repeatedRows`' key plus `kind`.
2. **Clusters by variant set.** Groups with ≥ 2 cells keep their exact cell set. A single-cell group (per-label widths) joins the smallest cluster that contains its cell. This yields "Big FAN: height + type + per-cell widths" as one finding.
3. **Scope** = `commonProps(cells)` (`view.ts:120-133`), plus an "also varies: Axis ∈ {…}" line.
4. **Scope check.** Compared cells (not `missing`) in that scope that don't fail:
   - **0:** "fix once at that level" (Badge F2, Count).
   - **> 0:** "mapping or missing code variant; don't edit the shared variant" (Badge F1, Checkbox F1).

   This is the guard that axis-level grouping alone lacks.
5. **Artifacts** collapse into one "No action" line.

Result on current results: Badge goes from 16 per-cell prompts to 6 findings plus 1 no-action line. Checkbox goes from 6 to 1, Radio from 8 to 1.

## 5. Templates

### Single component

```text
Fix design drift in {componentFile}: it differs from its Figma source of truth.
Each finding gives what differs (expected = Figma, received = rendered code), the Figma nodes (open them with Figma MCP get_design_context / get_screenshot before editing), where the value most likely lives in code (candidates, file:line), and how to fix it. Findings are grouped by the set of variants they hit: fix each group once, at the level its scope check allows.

## Figma drift: {componentFile}
- Component: {componentFile} · variants {variantsFile} ({cvaName}) · tokens {generatedTokens} (generated), {handTokens} (hand-maintained)
- Figma set: {setName} — {setUrl} (file {fileKey}, node {setNodeId})
- Variant → props mapping: {storyFile} (verification context: story {storyId})
- Status: {failing} of {compared} compared variants fail · data {resultFile}

### F{n}. {kinds} — {count} variant(s): {scopeProps}
Also varies: {Axis ∈ {…}; …}                      ← only if any
Figma: {firstVariantUrl} · also nodes {id, …}
Scope check: {"every compared variant with these props fails the same way → one fix at that level." | "{k} other variant(s) with the same props PASS ({ids}). Editing the shared variant would break them: check the mapping first, or narrow the fix."}
What is wrong (expected = Figma, received = code):
- [{kind}] [{ids} only]? {element} · {property}: expected {expected}, received {received} (tol {tolerance}){ — Figma = {token} ({file:line})}?
Where it lives: {file:line `class` (axis.value|base|literal → token)} · …  | {componentFile} JSX, or the mapping in {storyFile}
How to fix: [{kind}] {one line per kind}
Images: figma {reference} · code {actual} · diff {diff}   ← pixel-only / size mismatch only

No action — [comparator artifact] on {n} variant(s): …   ← only if any

## Rules
- Edit the owner, not the symptom: the cva variant/axis or base class named under "Where it lives", or the component JSX. No per-variant overrides, no className patches at call sites.
- Never hardcode a Figma raw value (hex, hsl, px). Use the token or scale step; if none fits, add a token to the hand-maintained token file ({handTokens}), never to the generated one ({generatedTokens}).
- [wrong token]: swap the class to the named token; never change a token value. [token value drift]: do not edit the component; report the token and its consumers. [comparator artifact]: no change.
- If the scope check says other variants with the same props pass, the variant → props mapping or a missing code variant is the likely cause: confirm in Figma, then fix the mapping or report the missing variant instead of editing the shared variant.
- Do not edit Figma references, baselines, tolerances, or the approved/ignore lists to make a finding pass.
- If a difference is deliberate (accessibility requirement, documented decision), do not fix it: propose {approvalMechanism} with a one-line reason, and move on.
- If your agent has these skills, use them: figma-qa to confirm the file:line that owns a value{; diagnosing-bugs for pixel-only and size-mismatch findings — only if such findings exist}.

## Done when
`{verifyCommand}` shows the variants above within tolerance and no other variant starts failing (now: {passing}/{compared} pass in {component}). Report each finding as: fixed (file:line), mapping fixed, approval proposed (reason), or not fixed (why).
```

### Multi-component (copy-all)

Same template, with these differences:

- Line 1 becomes: `Fix design drift in {N} components ({files}). Work one component at a time, in order.`
- The component sections repeat, with the intro, Rules and Done-when printed once.
- Done-when lists the pass count per component.

Order the components by number of non-artifact findings. Sequential work in one session, per the previous note's concurrency finding.

Placeholders that come from config, not data: `{verifyCommand}`, `{generatedTokens}`, `{handTokens}`, `{approvalMechanism}`. Everything else comes from the result JSON.

### Rendered: Checkbox (real data, prototype output, 4.6 KB)

```text
Fix design drift in src/components/ui/Checkbox/index.tsx: it differs from its Figma source of truth.
Each finding gives what differs (expected = Figma, received = rendered code), the Figma nodes (open them with Figma MCP get_design_context / get_screenshot before editing), where the value most likely lives in code (candidates, file:line), and how to fix it. Findings are grouped by the set of variants they hit: fix each group once, at the level its scope check allows.

## Figma drift: src/components/ui/Checkbox/index.tsx

- Component: src/components/ui/Checkbox/index.tsx · variants src/components/ui/Checkbox/utils/variants.ts (checkboxVariants) · tokens src/styles/tokens.css (generated), src/styles/tokens-supplement.css (hand-maintained)
- Figma set: Check box outline blank — https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=9183-5528 (file GPPlxspxcbP4kc13YwNJTH, node 9183:5528)
- Variant → props mapping: src/components/ui/Checkbox/Checkbox.stories.tsx (verification context: story ui-checkbox--figma-matrix)
- Status: 6 of 24 compared variants fail · data visual/.results/figma/results/ui-checkbox--figma-matrix.json

### F1. pixel-only — 6 variant(s): no shared prop
Also varies: State ∈ {Default, Disabled}; Status ∈ {Checked, Indeterminate}
Figma: https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=9183-5526 · also nodes 9185:4516, 9185:4452, 9185:4584, 9185:4476, 9185:4590
Scope check: 18 other variant(s) with the same props PASS (9183:5527, 9185:4488, 9185:4492). Editing the shared variant would break them: check the mapping first, or narrow the fix.
What is wrong (expected = Figma, received = code):
- [pixel-only] Component · Pixels: expected ≤5.0%, received 47.7–50.3%
Where it lives: variants.ts:13 `text-border-primary` (base → --color-border-primary) · variants.ts:14 `data-[checked]:text-icons-general-strong` (base → --color-icons-general-strong) · variants.ts:14 `data-[indeterminate]:text-icons-general-strong` (base → --color-icons-general-strong) · variants.ts:15 `data-[disabled]:text-border-control-disabled` (base → --color-border-control-disabled) · variants.ts:16 `data-[invalid]:text-border-negative` (base → --color-border-negative) · variants.ts:18 `not-data-[disabled]:not-data-[invalid]:hover:text-border-control-hover` (base → --color-border-control-hover) · variants.ts:19 `not-data-[disabled]:active:text-border-control-pressed` (base → --color-border-control-pressed) · variants.ts:20 `not-data-[disabled]:focus-visible:text-border-focused` (base → --color-border-focused)
How to fix: [pixel-only] compare the three images, find the unmeasured difference (glyph, stroke, inner fill) and its owner; if it is renderer noise, say so.
Images: figma visual/.results/figma/refs/GPPlxspxcbP4kc13YwNJTH-9183-5528-9183-5526.png · code visual/.results/figma/ui-checkbox--figma-matrix-9183-5526-actual.png · diff visual/.results/figma/ui-checkbox--figma-matrix-9183-5526-diff.png

## Rules
- Edit the owner, not the symptom: the cva variant/axis or base class named under "Where it lives", or the component JSX. No per-variant overrides, no className patches at call sites.
- Never hardcode a Figma raw value (hex, hsl, px). Use the token or scale step; if none fits, add a token to the hand-maintained token file (src/styles/tokens-supplement.css), never to the generated one (src/styles/tokens.css).
- [wrong token]: swap the class to the named token; never change a token value. [token value drift]: do not edit the component; report the token and its consumers. [comparator artifact]: no change.
- If the scope check says other variants with the same props pass, the variant → props mapping or a missing code variant is the likely cause: confirm in Figma, then fix the mapping or report the missing variant instead of editing the shared variant.
- Do not edit Figma references, baselines, tolerances, or the approved/ignore lists to make a finding pass.
- If a difference is deliberate (accessibility requirement, documented decision), do not fix it: propose an approval entry for the story's `approved` list with a one-line reason, and move on.
- If your agent has these skills, use them: figma-qa to confirm the file:line that owns a value; diagnosing-bugs for pixel-only and size-mismatch findings.

## Done when
`pnpm vrt figma` shows the variants above within tolerance and no other variant starts failing (now: 18/24 pass in Checkbox). Report each finding as: fixed (file:line), mapping fixed, approval proposed (reason), or not fixed (why).
```

### Rendered: Badge (real data, prototype output, 11.7 KB)

```text
Fix design drift in src/components/ui/Badge/index.tsx: it differs from its Figma source of truth.
Each finding gives what differs (expected = Figma, received = rendered code), the Figma nodes (open them with Figma MCP get_design_context / get_screenshot before editing), where the value most likely lives in code (candidates, file:line), and how to fix it. Findings are grouped by the set of variants they hit: fix each group once, at the level its scope check allows.

## Figma drift: src/components/ui/Badge/index.tsx

- Component: src/components/ui/Badge/index.tsx · variants src/components/ui/Badge/utils/variants.ts (badgeVariants) · tokens src/styles/tokens.css (generated), src/styles/tokens-supplement.css (hand-maintained)
- Figma set: Badge — https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=8673-4388 (file GPPlxspxcbP4kc13YwNJTH, node 8673:4388)
- Variant → props mapping: src/components/ui/Badge/Badge.stories.tsx (verification context: story ui-badge--figma-matrix)
- Status: 16 of 24 compared variants fail · data visual/.results/figma/results/ui-badge--figma-matrix.json

### F1. value + wrong token — 3 variant(s): Size=Big, Type=Label, Leading=Icon, Mode=None
Also varies: State ∈ {Error, Running, Updating}; Tone ∈ {Negative, Positive, Neutral}
Figma: https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=12570-5990 · also nodes 12570:141270, 12570:141293
Scope check: 3 other variant(s) with the same props PASS (10330:187048, 10330:198995, 10330:198999). Editing the shared variant would break them: check the mapping first, or narrow the fix.
What is wrong (expected = Figma, received = code):
- [value] Component · Height: expected 24px, received 30px (tol ±1px)
- [value] Text "FAN n" · Left offset: expected 8px, received 10px (tol ±1px)
- [value] Text "FAN n" · Vertical centre: expected 12px, received 14.5px (tol ±1px)
- [value] Text "FAN n" · Font size: expected 12px, received 10px (tol exact)
- [value] Text "FAN n" · Line height: expected 16px, received 14px (tol ±1px)
- [value] Text "FAN n" · Letter spacing: expected 0px, received 0.4px (tol ±0.05px)
- [value] [12570:5990 only] Component · Width: expected 62px, received 44px (tol ±2.25px)
- [value] [12570:5990 only] Text "FAN n" · Width: expected 28px, received 24px (tol ±2.25px)
- [value] [12570:141270 only] Component · Width: expected 65px, received 47px (tol ±2.25px)
- [value] [12570:141270 only] Text "FAN n" · Width: expected 31px, received 27px (tol ±2.25px)
- [value] [12570:141293 only] Component · Width: expected 64px, received 46px (tol ±2.25px)
- [value] [12570:141293 only] Text "FAN n" · Width: expected 30px, received 26px (tol ±2.25px)
- [wrong token] [12570:141293 only] Component · Background: expected hsl(217.5 8.2% 38% / 0.06), received hsl(0 0% 100% / 0.039) (tol ±3 per RGB channel) — Figma = --color-surface-fan-badge-updating (src/styles/tokens-supplement.css:339)
- [wrong token] [12570:141293 only] Text "FAN n" · Colour: expected hsl(214.7 17.8% 79%), received hsl(0 0% 99.6%) (tol ±3 per RGB channel) — Figma = --color-grey-250 (src/styles/tokens.css:105)
Where it lives: variants.ts:11 `text-caption-s-medium` (base → --text-caption-s-medium) · variants.ts:11 `tracking-[0.4px]` (base) · variants.ts:13 `[&>svg]:size-[14px]` (base) · variants.ts:19 `bg-surface-control` (variant.neutral → --color-surface-control) · variants.ts:19 `text-text-general-strong` (variant.neutral → --color-text-general-strong) · variants.ts:35 `gap-xxs` (size.lg → --spacing-xxs) · variants.ts:35 `px-badge-px` (size.lg → --spacing-badge-px) · variants.ts:35 `py-m` (size.lg → --spacing-m)
How to fix: [value] change the spacing/size/type class at the owner to the scale step that gives the Figma value. [wrong token] swap the class at the owner to the token Figma uses; token values stay.

### F2. value — 4 variant(s): Size=Medium, State=Default, Tone=Positive, Type=Mode, Leading=Dot
Also varies: Mode ∈ {Cool, Dry, Custom, Recondition}
Figma: https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=11640-163194 · also nodes 11640:163237, 11640:163249, 11640:163245
Scope check: every compared variant with these props fails the same way → one fix at that level.
What is wrong (expected = Figma, received = code):
- [value] Icon 1 "Icon" · Size: expected 14 × 14px, received 12 × 12px (tol ±1px)
- [value] [11640:163194 only] Text "COOL" · Left offset: expected 24px, received 22px (tol ±1px)
- [value] [11640:163237 only] Component · Width: expected 52px, received 50.2px (tol ±1.75px)
- [value] [11640:163237 only] Text "DRY" · Left offset: expected 24px, received 22px (tol ±1px)
- [value] [11640:163249 only] Text "CUSTOM" · Left offset: expected 24px, received 22px (tol ±1px)
- [value] [11640:163245 only] Text "RECONDITION" · Left offset: expected 24px, received 22px (tol ±1px)
Where it lives: index.tsx:27 `size-l` (literal → --spacing-l) · variants.ts:13 `[&>svg]:size-[14px]` (base) · variants.ts:33 `gap-xxs` (size.md → --spacing-xxs) · variants.ts:33 `px-m` (size.md → --spacing-m) · variants.ts:33 `py-xs` (size.md → --spacing-xs)
How to fix: [value] change the spacing/size/type class at the owner to the scale step that gives the Figma value.

### F3. value — 3 variant(s): Size=Medium, Tone=Neutral, Type=Count, Mode=None
Also varies: State ∈ {Default, Disabled}; Leading ∈ {Chevron, without Chevron}
Figma: https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=12769-24583 · also nodes 12788:144336, 12773:143040
Scope check: every compared variant with these props fails the same way → one fix at that level.
What is wrong (expected = Figma, received = code):
- [value] Component · Height: expected 24px, received 22px (tol ±1px)
- [value] Component · Corner radius: expected 1000px, received 4px (tol ±1px)
- [value] Text "n" · Vertical centre: expected 12px, received 10.5px (tol ±1px)
- [value] Text "n" · Font size: expected 12px, received 10px (tol exact)
- [value] Text "n" · Line height: expected 16px, received 14px (tol ±1px)
- [value] Text "n" · Letter spacing: expected 0px, received 0.4px (tol ±0.05px)
- [value] [12788:144336 only] Component · Width: expected 24px, received 22.41px (tol ±1.25px)
- [value] [12788:144336 only] Text "n" · Width: expected 8px, received 6.41px (tol ±1.25px)
Where it lives: variants.ts:11 `rounded-badge` (base → --radius-badge) · variants.ts:11 `text-caption-s-medium` (base → --text-caption-s-medium) · variants.ts:11 `tracking-[0.4px]` (base) · variants.ts:13 `[&>svg]:size-[14px]` (base) · variants.ts:33 `gap-xxs` (size.md → --spacing-xxs) · variants.ts:33 `px-m` (size.md → --spacing-m) · variants.ts:33 `py-xs` (size.md → --spacing-xs)
How to fix: [value] change the spacing/size/type class at the owner to the scale step that gives the Figma value.

### F4. structure — 5 variant(s): Mode=None
Also varies: Size ∈ {Big, Medium}; State ∈ {Error, Running, Updating, Default, Disabled}; Tone ∈ {Negative, Positive, Neutral}; Type ∈ {Label, Count}; Leading ∈ {Icon, Chevron}
Figma: https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=12570-5990 · also nodes 12570:141270, 12570:141293, 12769:24583, 12773:143040
Scope check: 8 other variant(s) with the same props PASS (8673:4507, 11705:9612, 11643:163253). Editing the shared variant would break them: check the mapping first, or narrow the fix.
What is wrong (expected = Figma, received = code):
- [structure] Icons · Count: expected 1, received 0 (tol exact)
Where it lives: src/components/ui/Badge/index.tsx JSX, or the mapping in src/components/ui/Badge/Badge.stories.tsx
How to fix: [structure] add/remove the element in the component JSX, or fix the mapping if the caller supplies it.

### F5. value — 2 variant(s): Size=Medium, Tone=Neutral, Type=Count, Leading=Chevron, Mode=None
Also varies: State ∈ {Default, Disabled}
Figma: https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=12769-24583 · also nodes 12773:143040
Scope check: every compared variant with these props fails the same way → one fix at that level.
What is wrong (expected = Figma, received = code):
- [value] Component · Width: expected 39px, received 25.81px (tol ±1.5px)
- [value] Text "n" · Left offset: expected 6px, received 8px (tol ±1px)
Where it lives: variants.ts:13 `[&>svg]:size-[14px]` (base) · variants.ts:33 `gap-xxs` (size.md → --spacing-xxs) · variants.ts:33 `px-m` (size.md → --spacing-m) · variants.ts:33 `py-xs` (size.md → --spacing-xs)
How to fix: [value] change the spacing/size/type class at the owner to the scale step that gives the Figma value.

### F6. pixel-only — 2 variant(s): Size=Small, Tone=Neutral, Type=Label, Leading=None, Mode=None
Also varies: State ∈ {Default, Disabled}
Figma: https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=8017-294 · also nodes 11763:253127
Scope check: every compared variant with these props fails the same way → one fix at that level.
What is wrong (expected = Figma, received = code):
- [pixel-only] Component · Pixels: expected ≤5.0%, received 5.0–5.0%
Where it lives: not located statically
How to fix: [pixel-only] compare the three images, find the unmeasured difference (glyph, stroke, inner fill) and its owner; if it is renderer noise, say so.
Images: figma visual/.results/figma/refs/GPPlxspxcbP4kc13YwNJTH-8673-4388-8017-294.png · code visual/.results/figma/ui-badge--figma-matrix-8017-294-actual.png · diff visual/.results/figma/ui-badge--figma-matrix-8017-294-diff.png

No action — [comparator artifact] on 9 variant(s): Component Background = --color-surface-tag-positive; Component Background = --color-surface-tag-septenary; Component Background = --color-surface-warning; Component Background = --color-surface-tag-quaternary; Component Background = --color-surface-tag-octenary. Figma and code resolve to the same declared token value; the received colour is a canvas alpha round-trip.

## Rules
- Edit the owner, not the symptom: the cva variant/axis or base class named under "Where it lives", or the component JSX. No per-variant overrides, no className patches at call sites.
- Never hardcode a Figma raw value (hex, hsl, px). Use the token or scale step; if none fits, add a token to the hand-maintained token file (src/styles/tokens-supplement.css), never to the generated one (src/styles/tokens.css).
- [wrong token]: swap the class to the named token; never change a token value. [token value drift]: do not edit the component; report the token and its consumers. [comparator artifact]: no change.
- If the scope check says other variants with the same props pass, the variant → props mapping or a missing code variant is the likely cause: confirm in Figma, then fix the mapping or report the missing variant instead of editing the shared variant.
- Do not edit Figma references, baselines, tolerances, or the approved/ignore lists to make a finding pass.
- If a difference is deliberate (accessibility requirement, documented decision), do not fix it: propose an approval entry for the story's `approved` list with a one-line reason, and move on.
- If your agent has these skills, use them: figma-qa to confirm the file:line that owns a value; diagnosing-bugs for pixel-only and size-mismatch findings.

## Done when
`pnpm vrt figma` shows the variants above within tolerance and no other variant starts failing (now: 8/24 pass in Badge). Report each finding as: fixed (file:line), mapping fixed, approval proposed (reason), or not fixed (why).
```

These renders use the prototype's simplifications, which are listed under Method. Owners for `size.*` and `variant.*` come from the story `FIGMA_*` maps until code props are captured.

## 6. Implementation plan (minimal) **[rec]**

Order matters: step 1 first, because the colour kinds are wrong without it.

1. **Exact colour read.** Files: `visual/figma/colors.ts` and `spec.ts`.
   - `toRgba`: parse `rgb()`/`rgba()` computed strings directly. Use the canvas only for other serializations (oklch, color-mix).
   - Token parsing (`parseTokens`, `colors.ts:56-79`): parse the declared `hsl()` values exactly, without the canvas.
   - Add `token?: string` to `FigmaIssueValue` (`types.ts:88`): the token whose **declared** value equals the colour.
   - Expected effect on current data: 9 Badge colour issues disappear, and 4 Badge cells pass.
2. **Capture the source.**
   - `setup.ts` passes `context.task.meta.componentPath` to `figmaSaveStoryResult`.
   - `commands.ts:28` resolves `storyFile` and `componentFile` with `testPath` and `project.vite.pluginContainer.resolveId`.
   - `FigmaStoryResult` (`types.ts:138`) gains `source: { storyFile: string; componentFile: string | null }`.
3. **Capture code props per cell.**
   - `FigmaMatrix.tsx`: `MatrixContext` (`:50`) adds `component`. `Specimen` (`:156-166`) writes `data-figma-code` with the primitive props of the first `type === context.component` element found in `renderCell`'s output (`:737`).
   - `setup.ts:203-204` reads it.
   - `FigmaCellResult` (`types.ts:108`) gains `code: Record<string, string | number | boolean> | null`.
4. **Owners and findings, computed in Node at save time.**
   - New `visual/figma/findings.ts`, called from `figmaSaveStoryResult`. It uses the TypeScript API and fs, both Node-only, so this keeps the panel (browser) free of them.
   - It does: cva class sites, token `file:line`, kind classification (section 3 table), issue groups, clusters, scope check (section 4).
   - Writes `result.findings: FigmaFinding[]` into the result JSON.
   - Type: `{ kinds, cells: string[], scope, alsoVaries, passingInScope: string[], rows: {kind, element, property, expected, received, tolerance, cells?, targetToken?}[], owners: {file, line, cls, axis, value, token, tokenAt}[] }`.
5. **Prompt.**
   - In `view.ts`, replace `fixPrompt(story, entry)` (`:257-290`) with `findingsPrompt(results: FigmaStoryResult[], options: { verifyCommand; generatedTokens; handTokens; approval })`, browser-safe and pure. It renders section 5 from `findings`.
   - Panel per-cell prompt (`inspectorView`, `view.ts:390`, used at `figma-panel.tsx:449,632-647`): the same function, filtered to findings whose `cells` include the selected variant. It's still component-anchored.
   - Report copy-all (`report.ts:211-217` per story, `:905-928` global) calls it with one or all results.
   - `repeatedRows` stays for the HTML table only. Its per-row prompt (`report.ts:343,361`) and `VERIFY` (`:42`) go.
   - Also fixes the doubled `Δ Δ5` bug (`view.ts:280` + `spec.ts:46`), since the delta is no longer printed that way.
6. **Config.** One exported constant `FIGMA_FIX` in `visual/figma/types.ts`, next to `FIGMA_RESULTS_DIR`:
   - `{ verifyCommand: 'pnpm vrt figma', generatedTokens: 'src/styles/tokens.css', handTokens: 'src/styles/tokens-supplement.css', approval: "an entry in the story's figmaMatrix approved list" }`
   - `COPY_COMMAND` (`view.ts:19`) is kept for the UI button only.
7. **Later (needs a decision, see below).** Capture `boundVariables.color.id` in `figma-api.ts:70-80` and add `figmaVariable?: { id; name? }` to `FigmaIssueValue`.

Not needed: a Storybook index read at report time (the run already resolves the file), a cva runtime hook, or per-cell prompts.

## 7. Risks / open questions

- **Owner lines are candidates, not answers.** Families can't tell which `px-`/`gap-` caused a 2 px offset. The prompt says "candidates" and tells the agent to confirm with Figma MCP and figma-qa. Don't promote the first candidate to "the" line.
- **Code-props capture assumes `renderCell` returns a static element tree containing `meta.component`.** True for Badge, Checkbox and Radio. A cell that renders through a custom wrapper component (props hidden inside) gives `code: null`, and owners fall back to all axis values.
- **Scope check reads Figma props only.** It can't see that code renders two Figma variants with different props (chip vs plain badge, `Badge.stories.tsx:276-288`). With captured code props, compare scopes on code props too.
- **Static parse covers literal `cva` configs only.** No computed variants, no spread configs. All 10 current `cva` files are literal.
- **Deliberate deviations without an approval** (Checkbox white selected glyph, `variants.ts:4-5`) still read as findings. The prompt routes them to "propose approval". Whether to pre-classify comment-documented deviations is open.
- **Figma variable names** need Enterprise for REST. The `get_variable_defs` route works per node interactively, not in the sync.
- **Stale index.** `storybook-static/index.json` lacks the Figma-matrix stories, so never use it as the resolution source. The run-time resolution in plan step 2 avoids it.
- **Prior-note references drifted:** `fixPrompt` moved to `view.ts:257-290`, `blockConclusion` was removed, and the panel no longer has copy-all.

## Method

- Read the prior note, `visual/FIGMA-TESTING.md`, `visual/figma/{types,issues,view,spec,colors,setup,commands,sets,manifests,report,figma-api}.ts`, `FigmaMatrix.tsx` and `.storybook/figma-panel.tsx`, plus Badge, Checkbox and Radio (`index.tsx`, `utils/variants.ts`, stories), `src/styles/tokens*.css`, `storybook-mcp/AGENTS.md` and `.claude/rules/code-style.md`.
- Library sources checked in `node_modules`: `@storybook/addon-vitest` 11.0.0-beta.3, `storybook` 11.0.0-beta.3 (csf-tools, core-server indexer, types), `vitest` 5.1.1 (types).
- Live index: `curl http://localhost:6006/index.json`.
- Prototype: `node render.mts <storyId…>` (Node 26, type stripping, `typescript` 6.0.3 from the project) in the session scratchpad. It **only reads** project files and writes to stdout. It parses cva with the TypeScript API, parses token declared values exactly, uses manifest Figma colours, groups and clusters, and renders the template. Simplifications:
  - code props come from the story `FIGMA_*` maps by regex
  - owner families are heuristic
- Old prompt sizes: `fixPrompt` from `view.ts`, run on the same results.
- Colour probe: Playwright Chromium 159 headless, `getComputedStyle` vs canvas `getImageData`.
- Docs (fetched 2026-11-20): vitest.dev/api/browser/commands, developers.figma.com/docs/rest-api/file-property-types/, developers.figma.com/docs/rest-api/variables/.
- No project file was changed. One stray scratch copy (`storybook-mcp/.tmp-cs.mjs`) was created by mistake and deleted immediately, before it was run.
