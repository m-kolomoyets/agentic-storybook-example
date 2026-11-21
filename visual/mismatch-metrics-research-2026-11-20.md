# Figma mismatch metrics: what to measure, show and prompt (2026-11-20)

Scope: the parameters the Figma-vs-implementation checker (`visual/figma/`) compares, how its diffs read to humans, and how they are serialized into the fix prompt. Builds on, does not repeat:

- `visual/fix-prompt-research-2026-11-20.md`: prompt gaps (no location, drift vs wrong-token, stop condition, project leakage).
- `visual/fix-prompt-component-research-2026-11-20.md`: component-anchored findings, `cva` owner lookup, cluster + scope check, canvas colour artifact, `findings.ts` plan.
- `visual/figma-diff-research-2026-11-20.md`: overlay modes, addon survey.

**[fact]** = checked in the cited file/doc. **[rec]** = recommendation. **[unverified]** = plausible, source not read this session. Paths relative to `storybook-mcp/`.

## Verdict

1. **Measures too little, mostly the right way.** Spec covers root box, root radius, root solid fill, per-text-run box/font/colour, icon count/box. **No** stroke, effect/shadow, padding/gap/alignment, child fills, gradients, opacity, text case/decoration/alignment, icon identity or colour, token binding. Those fall to the pixel ratio, which is area-normalised and blind to thin features (§3).
2. **Current results are polluted by harness defects, not drift.** 9 of 13 Button pixel-only failures (24–88 %) are screenshots of the **matrix toolbar**, not the cell (§2 D1). 10 Badge `Background` rows are the canvas round-trip artifact (prior note). 3 Badge radius rows print Figma's pill sentinel `1000px`.
3. **Display is clear per row, weak per cause.** Rows show element · property · Figma · story · Δ · tolerance with swatches and nearest token, grouped by 4 coarse categories. Missing: CSS selector/source hint, Figma variable name, cascade suppression ("text offset follows from padding"), severity by property, harness tone.
4. **Prompt serialization loses structure.** `fixPrompt` flattens rows to prose, prints `Δ Δ5 RGB` (bug), no node id/selector/token binding, no kind. Prior notes fix the envelope; this note defines the **row schema** per metric (§5).

## 1. Inventory: what is compared today

### 1.1 Spec check (`spec.ts` `figmaSpecMismatches`, `spec.ts:188-378`)

| Element | Property | Figma source | DOM source | Tolerance | Category (`view.ts:165-177`) |
| --- | --- | --- | --- | --- | --- |
| Component | Width / Height | variant `absoluteBoundingBox` (`figma-api.ts:122-127`) | root `getBoundingClientRect` | ±1px; width + 0.25px × every char (`spec.ts:9,16,195-200`) | Layout & size |
| Component | Corner radius | `surface()` node `rectangleCornerRadii` / `cornerRadius` (`figma-api.ts:105-131`) | `border-*-radius` computed (`spec.ts:202-225`) | ±1px | Layout & size |
| Component | Background | first visible `SOLID` fill × paint opacity of `surface()` (`figma-api.ts:70-86`) | `background-color` via canvas `toRgba` (`colors.ts:12-22`) | ±3/255 per channel, α ±3/255 (`spec.ts:18-29`) | Color |
| Text "…" | Presence | `TEXT` `characters` | trimmed visible text node, exact string (`spec.ts:241-262`) | exact | Content |
| Text "…" | Left offset, Width | text `absoluteBoundingBox` | `Range` rect (`spec.ts:263-274`) | ±1px + 0.25px/char before edge | Layout & size |
| Text "…" | Vertical centre | box centre | range centre (`spec.ts:275-279`) | ±1px | Layout & size |
| Text "…" | Font family / Font file | `style.fontFamily` | first family in `font-family`; `document.fonts.check` (`spec.ts:281-299`) | exact | Typography |
| Text "…" | Font size, Font weight | `style.fontSize/fontWeight` | computed (`spec.ts:300-314`) | exact | Typography |
| Text "…" | Line height | `style.lineHeightPx` | `parseFloat(line-height)` (`spec.ts:315-318`) | ±1px | Typography |
| Text "…" | Letter spacing | `style.letterSpacing` (px per REST TypeStyle) | `parseFloat(letter-spacing) \|\| 0` (`spec.ts:319-325`) | ±0.05px | Typography |
| Text "…" | Colour | first visible SOLID text fill | `color` via canvas (`spec.ts:326-338`) | ±3/255 | Color |
| Icons | Count | `INSTANCE` with no `TEXT` descendant (`figma-api.ts:156-164`) | top-level `<svg>` + textless visible leaves, de-duplicated by box (`spec.ts:141-186`) | exact | Content |
| Icon n | Position, Size | instance box, matched by reading order | element rect (`spec.ts:361-375`) | ±1px (+ text slack on x) | Layout & size |

Captured but **never compared**: `icons[].component` (main component name, `types.ts:34`, `figma-api.ts:158-161`).

### 1.2 Pixel check (`setup.ts`)

- pixelmatch `threshold: 0.1`, `allowedMismatchedPixels: 0` → exact count (`setup.ts:103-104`).
- Text boxes painted `#ff00ff` on both images (`spec.ts:386-411`, `setup.ts:223`).
- `ratio = pixels / (Figma w × h × 4)` — full area, masks included (`setup.ts:229-230`).
- Gate `maxDiffRatio` default 5 % (`FIGMA-TESTING.md:277`); matching-cell noise 0–5.7 % (`FIGMA-TESTING.md:271-275`).
- `diff-map.ts` reclassifies differing pixels into figma-only / story-only / colour, with the most common colour pair (`diff-map.ts:13-18`). Shown in the panel; **not** in the prompt.

### 1.3 Ranking, grouping, ignore

- Severity `cellLevel`: pixel ratio ÷ allowed and **count** of rows; ≥4 rows = major (`view.ts:44-59`). A 0.02-alpha artifact weighs the same as a missing icon.
- Grouping: 4 categories per cell (`view.ts:161-177`); across cells `repeatedRows` by `slot|property|expected|actual` (`report.ts:316-369`).
- `ignore`: substring match on the flattened English sentence (`setup.ts:169-177`, `issues.ts:7-11`). Rewording `figmaIssueText` silently un-ignores; `'Letter spacing'` ignores every element.
- Prompt: `fixPrompt` (`view.ts:284-316`) — one prose line per row; `Δ ${issue.delta}` (`view.ts:306`) + `colorDelta` already prefixed `Δ` (`spec.ts:37-47`) → `Δ Δ5 RGB`.

## 2. Defects in the current results (evidence)

| # | Defect | Evidence | Effect | Fix [rec] |
| --- | --- | --- | --- | --- |
| D1 | **Occluded capture.** Cell screenshot shows the FigmaMatrix toolbar ("Onion skin · Difference …"), not the button | `visual/.results/figma/ui-button--figma-matrix-8274-18710-actual.png`, `…-8192-4834-actual.png` (viewed); Destructive 8274:18710/18722/18734 at 84–88 %, Secondary 8192:4834/4841/4848 at 26–27 % (`ui-button--figma-matrix.json`) | 9 false "pixel-only" fails; prompt tells agent to fix an inner glyph that is fine | Before `page.screenshot`: `scrollIntoView({block:'center'})`, hide sticky chrome during the run, assert `document.elementFromPoint(centre)` is inside the cell; on failure emit status `harness` (`setup.ts:203-255`) |
| D2 | Canvas colour round-trip (prior note §comparator artifact) | 10 Badge `Background` rows, e.g. Figma `hsl(145.7 63.9% 48.8% / 0.1)` vs `hsl(146.4 61.6% 50% / 0.102)`, same token both sides | 4 Badge cells fail only on this; `isDrift` mislabels | Parse computed `rgb()/rgba()` directly; canvas only for other syntaxes (`colors.ts:12-22`) |
| D3 | Pill sentinel radius not clamped | 3 Badge rows `1000px → 4px`; Hover manifests carry `radius [1000,…]` (`__refs__/…-8673-4388/manifest.json`) | Delta reads `−996px`; meaningless | Compare **effective** radius `min(r, w/2, h/2)` both sides (CSS clamps overlapping radii: css-backgrounds-3 §corner-overlap [unverified]) |
| D4 | Radius from wrong node | 30 approved Button rows `0px → 8px` | Noise inside approved cells; TRIAGE calls it harness (`TRIAGE.md` "Corner radius and pixels pass") | Pick radius from the node whose box equals root **and** has fills or strokes; else omit the check |
| D5 | Only one paint read | `solidFill` returns the first visible SOLID (`figma-api.ts:70-86`); gradients, stacked state overlays, IMAGE ignored. REST Paint `type` has 9 kinds incl. 4 gradients (file-property-types #paint-type) | Hover/pressed overlays and gradients unmeasured → pixel-only fails with no cause | Serialize full paint stack; composite stack over backdrop for comparison (§3) |
| D6 | Node `opacity` ignored | Only `paint.opacity` multiplied (`figma-api.ts:84`); REST FRAME `opacity` exists (file-node-types #frame-props) | Disabled-by-opacity states unmeasured both sides | Add `opacity` metric: Figma node opacity vs CSS `opacity` |
| D7 | Ratio dilution | `ratio = px / full area` (`setup.ts:229-230`). 1 CSS px stroke on a 300×200 card at 2x ≈ 4 000 of 240 000 px = 1.7 % < 5 % gate | Missing/wrong stroke on large components passes | Denominator = unmasked area; add largest diff **blob** metric (§3.3) |
| D8 | `line-height: normal` | `parseFloat('normal')` → NaN → row `NaNpx` (`spec.ts:315-318`); MDN: computed value for keywords is "as specified" | Unreadable row (kit text utilities always set line-height, `src/styles/tokens.css:626-640`, so rare) | Resolve `normal` from the range height, or report "normal (UA)" |
| D9 | Doubled delta | `view.ts:306` + `spec.ts:46` | `Δ Δ5 RGB` in every colour prompt row | Delta as number + unit (§5) |

## 3. Gap analysis by category

Legend: ✓ covered, ◐ partial/indirect, ✗ none. FP = false positive (fails, is fine), FN = false negative (passes, is wrong).

| Category | Today | Mapping correct? | Tolerance | FP / FN risk | Recommended metric · tolerance [rec] |
| --- | --- | --- | --- | --- | --- |
| Root geometry | ✓ w/h | yes | ±1px + 0.25/char on width | FP low (text slack); FN: width slack grows with label length (16 chars → ±5px) | keep; cap slack at `min(0.25×chars, 4px)` and only on HUG axes (`layoutSizingHorizontal=HUG`) |
| Child geometry | ◐ text, icons | icons by order only | ±1px | FN: wrong icon in right slot; FP: order flips when y differs | match icons by `component` name first, order second; compare `name` (D: `types.ts:34` unused) |
| Layout / flex | ✗ | — | — | FN: `justify-between` vs `start` invisible when content fills | `layoutMode→flex-direction`, `primaryAxisAlignItems→justify-content`, `counterAxisAlignItems→align-items`, `layoutWrap→flex-wrap` · exact enum (REST #frame-props) |
| Sizing mode | ✗ | — | — | FN: fixed width that happens to equal hug width at one label | `layoutSizing* FIXED/HUG/FILL` vs declared sizing · exact enum. `getComputedStyle` returns resolved px for `width` (MDN getComputedStyle: layout-dependent properties give used values), so read the **declared** class via the owner lookup (prior note) instead |
| Spacing | ◐ via text left offset | indirect | ±1px + slack | FP: blames text when padding wrong; FN: vertical padding never checked (only centre) | `paddingT/R/B/L` vs computed `padding-*` of the auto-layout element; `itemSpacing` vs `gap` (`column-gap`/`row-gap`); `counterAxisSpacing` vs other-axis gap · ±0.5px (declared values are integers) |
| Typography | ✓ family/size/weight/lh/ls | yes | exact / ±1 / ±0.05 | FN: case, decoration, alignment | add `textCase`→`text-transform` (UPPER/LOWER/TITLE→uppercase/lowercase/capitalize; SMALL_CAPS→`font-variant-caps`), `textDecoration`→`text-decoration-line` (UNDERLINE/STRIKETHROUGH→underline/line-through), `textAlignHorizontal`→`text-align`, `textAutoResize`/truncation→`text-overflow`+`white-space` · exact enum |
| Colour / fill | ◐ root + text, first SOLID | first paint ≠ top paint (D5); canvas (D2) | ±3/255 per channel | FP: artifacts; FN: overlays, gradients, child fills, node opacity | per painted node: full paint stack; compare (a) **declared** colour exactly to token value, (b) composited-over-backdrop colour with ΔEOK (CSS Color 4 §20) and α ±0.01. Threshold [rec] calibrate on current kit noise; start at ΔEOK ≤ 0.02 (JND figure [unverified]) |
| Gradient | ✗ | — | — | FN | type + stop count exact; stop positions ±1 %; stop colours as fill |
| Stroke | ✗ (pixels only) | — | — | FN: on large components (D7); kit draws strokes 4 ways: `border`, `outline`, `ring`, `inset-ring` (counts in `src/components/ui`: inset-ring 69, border 64, outline 32) | Figma `strokes`, `strokeWeight`, `individualStrokeWeights`, `strokeAlign` (INSIDE/OUTSIDE/CENTER), `strokeDashes` (REST #frame-props, #vector-props). DOM: gather all of `border-*`, `outline`, inset/outer spread-only `box-shadow` (Tailwind 4 `inset-ring` = `inset 0 0 0 N color`, `node_modules/tailwindcss/dist/lib.js:16`). Normalize to `{weight, align, colour, dashed, sides}` · weight ±0.25px, colour as fill, align exact. INSIDE ≙ border with `box-sizing:border-box` or inset ring; OUTSIDE ≙ outline/ring (MDN: outline takes no space) |
| Radius | ✓ root | sentinel (D3), node pick (D4) | ±1px | see D3/D4 | effective radius per corner · ±0.5px; add for painted children |
| Effects | ✗ | — | — | FN: shadows mostly below 5 % | `DROP_SHADOW`→outer `box-shadow` (or `filter: drop-shadow()` for non-rect shapes: no spread, MDN), `INNER_SHADOW`→`inset` box-shadow, `LAYER_BLUR`→`filter: blur()`, `BACKGROUND_BLUR`→`backdrop-filter` (REST #effect-type). Parse computed `box-shadow` list, drop zero `0 0 #0000` placeholders and spread-only rings (those are strokes). Per shadow: x/y ±0.5px, blur ±1px, spread ±0.5px, colour as fill, count exact |
| Opacity / blend | ✗ | — | — | FN: disabled states | node `opacity` vs CSS `opacity` ±0.01; `blendMode` ≠ NORMAL/PASS_THROUGH → `mix-blend-mode` exact |
| Token binding | ◐ nearest **code** token by value (`colors.ts:93-111`) | not a binding | — | FP: drift/wrong-token mislabels (prior note) | Read `boundVariables` from `/files/:key/nodes` (REST: "returns a `boundVariables` property, containing the `variableId`"; no plan stated for node data). Names need `/variables/local` (**Enterprise**, `file_variables:read`) or MCP `get_variable_defs` ("variables and styles used in your selection"). Code side: token from the owning class (prior note `findings.ts`). Compare **token identity first, value second** |
| Icons / vectors | ◐ count + box | order-matched | exact / ±1px | FN: wrong glyph, wrong colour | add identity (`component` vs `data-icon`/svg file name), fill colour of the vector (`fills` on VECTOR vs svg `fill`/`color`), and pixel blob inside the icon box |
| States / variants | ◐ pixels only | — | 5 % | FN: hover overlay (D5); FP: occlusion (D1), spinner frames | same metrics per state cell; forced-state sanity: assert the forcing class/attr is present before measuring |
| Text content | ✓ exact | ok | exact | FP: whitespace/NBSP, `textCase` applied in source | normalize whitespace; compare post-transform text only when `textCase` matches |
| A11y | separate rows (`a11y.ts:175-240`): role, name, focusable, contrast 4.5/3 (`a11y.ts:201-204`), target 24×24 (`a11y.ts:224-227`) | WCAG 1.4.3 thresholds correct (WCAG 2.2 Understanding 1.4.3) | — | not linked to Figma deviation | add **Figma-side** contrast for the same text/fill pair; when code contrast ≥ min > Figma contrast, mark row `kind: a11y-deviation` → approval candidate (ADR 0002). Add non-text contrast 3:1 for strokes/focus rings (WCAG 1.4.11) |

### 3.1 Pixel metrics to add

| Metric | Definition | Why |
| --- | --- | --- |
| `ratioUnmasked` | diff px / (area − masked px) | removes dilution by text masks (D7) |
| `maxBlob` | largest 8-connected diff component, CSS px² + bbox | thin strokes and small glyph errors exceed it while ratio stays low |
| `blobOwner` | element whose rect contains the blob bbox (`elementsFromPoint` at bbox centre) → selector | turns "pixel-only" into "inside `svg.icon` / `::before` of `.badge`" |
| `classCounts` | diff-map figma-only / story-only / colour (`diff-map.ts:13-18`) | already computed; serialize it |
| `occluded` | `elementFromPoint(centre)` not within cell | D1 |

Gate [rec]: fail if `ratioUnmasked > maxDiffRatio` **or** `maxBlob ≥ 4 CSS px²` outside AA (calibrate on matching cells first, as `FIGMA-TESTING.md:271-275` did).

## 4. Display for humans

### 4.1 Row

One row per (element, metric). Columns (example values illustrative; selectors and token names are not from a run):

| Element | Property | Figma | Rendered | Δ | Tol | Token (Figma → code) | Kind |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `Text "FAN n"` · `span.badge__label` | font-size | 12px | 10px | −2px | exact | `caption-m` → `caption-s` | wrong token |
| Root · `.badge` | padding-block | 4px | 7px | +3px | ±0.5 | `--spacing-xs` → `--spacing-m` | value |
| Root · `.badge` | background | ▮ `#2dcc711a` | ▮ `#2dcc711a` | ΔEOK 0 | 0.02 | `surface/tag-positive` = `--color-surface-tag-positive` | — (hidden: passes once D2 fixed) |
| Root · `button` | stroke | 1px inside ▮ `#ffffff1a` | none | missing | — | `border/default` → — | structure |
| Root · `button` | shadow[0] | 0 6 18 −4 ▮ `#0000001a` | 0 3 6 0 ▮ `#0000001a` | y −3 · blur −12 · spread +4 | ±0.5/±1 | `--shadow-button` → `--shadow-button-remote` | wrong token |
| Icon 1 `StarFour` · `svg` | identity | `StarFour` | `Sparkle` | — | exact | — | structure |

Rules [rec]:

- **Selector column** (`tag.class` of the measured element, stable `data-slot` if present) — today only the Figma-side name shows.
- **Token column** replaces the `note` sub-line: Figma variable (bound) → code token (owning class). `≈` only when no binding exists, labelled "nearest by value".
- **Colour**: swatch + hex8 (shorter than HSL, exact), HSL on hover; ΔEOK as Δ. Alpha colours also show the composited value.
- **Kind** badge: `structure · value · wrong token · token drift · mapping · a11y deviation · harness`, same vocabulary as `TRIAGE.md` and figma-qa.
- Numbers: `Δ` signed with unit, tolerance omitted when `exact` passes.

### 4.2 Grouping and order

- **By cause, not category.** Cell inspector: findings (prior note §4 clusters) first, then rows. Within a cell, collapse dependents: if `padding-left` is off by +2px, `Text … left offset +2px` and `Icon … x +2px` render as "follows from padding-left" (dimmed, not counted). Rule: a child-position row whose Δ equals an ancestor spacing/size row's Δ (±0.5px) gets `causeId` of that row.
- **Severity by property, not count** [rec]: `harness` (shown first, separate tone, never "fix") > structure > root size (cascades) > layout/spacing > typography > stroke/effects > colour > pixel-only. Replace `cellLevel` count with max row severity × cells affected.
- Pixel-only callout names `blobOwner` and blob bbox, overlaid as a box on the "what differs" tile.

## 5. Prompt context schema

Envelope (target, Figma URLs, owners, rules, done-when) is in the component-research note §5. This section fixes the **rows** it carries.

### 5.1 Types (sketch, `types.ts`)

```ts
export type MetricId =
    | 'size.width' | 'size.height' | 'radius'
    | 'layout.direction' | 'layout.justify' | 'layout.align' | 'layout.wrap' | 'layout.sizing'
    | 'space.padding' | 'space.gap'
    | 'type.family' | 'type.size' | 'type.weight' | 'type.lineHeight' | 'type.letterSpacing'
    | 'type.case' | 'type.decoration' | 'type.align'
    | 'fill' | 'fill.gradient' | 'opacity' | 'blend'
    | 'stroke' | 'effect.shadow' | 'effect.blur'
    | 'text.presence' | 'icon.count' | 'icon.identity' | 'icon.box' | 'icon.fill'
    | 'pixels';

export type IssueKind =
    | 'structure' | 'value' | 'wrong-token' | 'token-drift' | 'mapping' | 'a11y-deviation' | 'harness';

export type TokenRef = { figma?: { id: string; name?: string }; code?: string; nearest?: string };

export type SpecValue =
    | { t: 'len'; px: number }
    | { t: 'num'; v: number }
    | { t: 'enum'; v: string }
    | { t: 'color'; hex8: string; composited?: string }
    | { t: 'stroke'; weight: number; align: 'inside' | 'outside' | 'center'; hex8: string; sides?: [number, number, number, number]; dashed?: boolean }
    | { t: 'shadow'; inset: boolean; x: number; y: number; blur: number; spread: number; hex8: string }
    | { t: 'none' };

export type FigmaIssueV2 = {
    id: string; // stable: `${figmaNodeId}|${metric}|${index}`
    metric: MetricId;
    element: { label: string; figmaNodeId: string; selector: string | null };
    expected: SpecValue & { token?: TokenRef };
    actual: SpecValue & { token?: TokenRef };
    delta: number | null; // signed, in the metric's unit
    tol: number | 'exact';
    kind: IssueKind;
    severity: 1 | 2 | 3 | 4;
    causeId?: string; // dependent row → its cause
};
```

`FigmaIssue` (`types.ts:95-106`) stays as the view model; `figmaIssueText`/`ignore` move to `{ element?, metric }` matching (`setup.ts:169-177`).

### 5.2 Serialization rules

| Include | Omit (tokens saved) |
| --- | --- |
| rows with `causeId` absent; dependents as `(+n follow)` | dependent rows, passing rows, approved/ignored cells |
| token identity both sides; values only when tokens are equal (drift) or absent | HSL strings, swatches, nearest-token chains `alias → primitive +13` |
| `selector` + Figma node id once per element | per-row repeated element names → element header line |
| hex8 for colour, `px` for lengths, enum literal | tolerance when `exact`; pixel % when any spec row exists |
| images, `maxBlob` bbox, `blobOwner` only for pixel-only / harness | image paths otherwise |
| `kind` per row | category headings (Layout/Typography…) |
| `harness` findings as "do not edit component" line | — |

Dedup across cells: key `metric|element.label (digits→n)|expected|actual` (extends `report.ts:320-334`), then cluster by cell set (component-research §4).

### 5.3 Rendered example (Badge F1, illustrative values from current results)

```text
### F1. value + wrong-token — 3 variants: Size=Big, Type=Label, Leading=Icon (12570:5990, 141270, 141293)
Scope check: 3 other Size=Big variants PASS → check mapping before editing size.lg.
root `span.badge` (12570:5990)
- [value] size.height 24→30px Δ+6 tol 1
- [value] space.padding-block 4→7px Δ+3 (Figma --spacing-xs, code --spacing-m)
text "FAN n" `span` 
- [wrong-token] type 12/16 → 10/14px, ls 0→0.4 (Figma caption-m, code caption-s)
- (+3 follow: left offset, centre, width)
icons
- [structure] icon.count 1→0 (Figma StarFour)
Owners: variants.ts:35 size.lg · variants.ts:11 base type
```

Same rows today cost ~1.4 KB per cell (prior note §1); this shape is ~0.5 KB per **finding**.

Pixel-only / harness:

```text
### F4. harness — 6 variants: Destructive/Secondary × Hover/Focused/Pressed/Loading
Story capture shows toolbar, not the cell (occluded). Do not edit the component. Re-run after harness fix.
```

## 6. Changes by file

| File | Change |
| --- | --- |
| `visual/figma/figma-api.ts` | extend `FigmaNode` (strokes, strokeWeight, individualStrokeWeights, strokeAlign, strokeDashes, effects, opacity, blendMode, layoutMode, itemSpacing, padding*, layoutSizing*, *AxisAlignItems, layoutWrap, boundVariables; TypeStyle textCase/textDecoration/textAlignHorizontal); full paint stack; effective radius; per painted-node spec |
| `visual/figma/types.ts` | `FigmaSpec` v2 (nodes with paints/strokes/effects/layout), `FigmaIssueV2`, `MetricId`, `IssueKind`, pixel metrics on `FigmaCellResult.image` |
| `visual/figma/spec.ts` | new metrics (§3), stroke/shadow normalizer over border/outline/box-shadow, selector capture, `causeId` pass, `line-height: normal` |
| `visual/figma/colors.ts` | exact `rgb()` parse (D2), hex8, ΔEOK |
| `visual/figma/setup.ts` | occlusion check + harness status (D1), unmasked ratio, blob metrics, structured `ignore` |
| `visual/figma/diff-map.ts` | export blob bbox + counts for results JSON |
| `visual/figma/view.ts` | severity by property, kind badges, cause grouping, token column; prompt rows per §5 (fixes `Δ Δ`, D9) |
| `visual/figma/report.ts`, `.storybook/figma-panel.tsx` | render the new row (selector, token, kind, follow-ups); `repeatedRows` key on `metric` |
| `.claude/skills/figma-matrix/TRIAGE.md`, `visual/FIGMA-TESTING.md` | new signals (stroke, shadow, harness/occluded), tolerance table |

Order: D1 + D2 first (they account for 13 of the 44 current failing cells: 9 occluded Button cells, 4 Badge cells failing only on the colour artifact), then strokes/effects/spacing (largest FN classes for this kit), then token binding.

## Sources

- Code: files and lines cited inline; results `visual/.results/figma/results/*.json` (ran 2026-11-20T19:15Z); images viewed: `visual/.results/figma/ui-button--figma-matrix-8274-18710-actual.png`, `…-8192-4834-actual.png`, `visual/figma/__refs__/GPPlxspxcbP4kc13YwNJTH-8274-18709/8274-18710.png`, `…-8038-2005/8192-4834.png`.
- Figma REST node and property types: https://developers.figma.com/docs/rest-api/file-node-types/ (#frame-props, #vector-props, #text-props), https://developers.figma.com/docs/rest-api/file-property-types/ (#paint-type, #effect-type, #typestyle-type, #blendmode-type, #layoutconstraint-type).
- `geometry=paths`, nodes endpoint: https://developers.figma.com/docs/rest-api/file-endpoints/#get-file-nodes-endpoint.
- Variables (Enterprise, `file_variables:read`; `boundVariables` ids in file JSON): https://developers.figma.com/docs/rest-api/variables/, https://developers.figma.com/docs/rest-api/variables-endpoints/.
- Bindable fields: https://developers.figma.com/docs/plugins/api/VariableBindableNodeField/, https://developers.figma.com/docs/plugins/api/properties/nodes-boundvariables/.
- Figma MCP `get_design_context` / `get_variable_defs`: https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/.
- CSS: https://developer.mozilla.org/en-US/docs/Web/CSS/line-height, https://developer.mozilla.org/en-US/docs/Web/API/Window/getComputedStyle, https://developer.mozilla.org/en-US/docs/Web/CSS/box-shadow, https://developer.mozilla.org/en-US/docs/Web/CSS/filter-function/drop-shadow, https://developer.mozilla.org/en-US/docs/Web/CSS/outline, https://developer.mozilla.org/en-US/docs/Web/CSS/text-decoration-line.
- Colour difference (ΔE2000, ΔEOK, ΔEOK2, ΔEOKr2; non-normative): https://www.w3.org/TR/css-color-4/#color-difference.
- WCAG: https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html, https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html.
- Tailwind 4.3.5 ring/inset-ring → `box-shadow`: `node_modules/tailwindcss/dist/lib.js:16`.
- Not read this session (marked [unverified]): CSS corner-overlap clamping (css-backgrounds-3), MDN letter-spacing / text-transform (fetch returned wrong content), an Oklab JND value, Figma paint-array order.
