# Figma diff in Storybook: research (2026-11-20)

Goal: a "Figma" addon tab, next to Chromatic's "Visual tests", that compares **the current story as configured in Controls** against the matching Figma variant. It should not need dedicated `figma` stories. A second view lays out a grid of every variant/state of a component, each cell compared with its Figma cell. It should look good and stay fast.

## Verdict

Yes, it's feasible, without new runtime dependencies. Three parts, cheapest first:

1. **Live overlay in the preview** (no screenshots): draw the Figma PNG over the rendered story and blend it in the browser. It follows Controls instantly. This is the interactive view.
2. **Args ↔ Figma variant mapping**, declared once per component. With it, any story or Controls state picks its own Figma node, and the grid can be generated.
3. **Measured diffs** (the `vrt-figma` Vitest run, already built): per-story or per-cell numbers, a CI gate, and the report page. The live view is for looking; the run is for numbers.

## 1. Live overlay (panel tab + preview decorator)

The panel (manager) holds the controls. A preview decorator draws the overlay. They talk over the Storybook channel. Story content stays live, so Controls changes re-diff with no extra work.

| Mode | How | Why |
| --- | --- | --- |
| Side by side | Figma image next to the story | Orientation |
| Onion skin | Figma `<img>` over the story root, opacity slider | Spotting offsets |
| **Difference** | `mix-blend-mode: difference`: identical pixels go black, any drift glows | Best single view. Free and exact per pixel, because the browser does the math |
| Swipe | `clip-path: inset()` with a handle | Edges, alignment |
| Blink | Toggle layers about 1 Hz | Small shifts the eye misses in a static view |
| **Redlines** | Figma boxes from the spec (root, text runs, icons) as outlines over the DOM, labelled with the delta ("x +2px") | Most actionable for devs. Reuses `visual/figma/spec.ts` live |

- Position: absolutely over the story root element (`getBoundingClientRect`), with `srcset="… 2x"` so the 2x Figma export maps 1:1 to CSS px.
- The panel lists live spec mismatches. `spec.ts` is pure DOM, so it can run in the preview on every render.
- Content problem: the Figma cell says "Generate Automations" with ★ icons, but the story says "Save", so a pixel diff is meaningless. Fix: a **"Use Figma content"** toggle sets args from the Figma node (text runs → `children`; icon instances → kit SVGs by name, e.g. `StarFour` → `star-four.svg`). With the toggle off, only spec checks for box size, padding, radius, colour and fonts run. Text-width checks are skipped.

Prior art: overlay addons exist, such as [Figma Sync](https://storybook.js.org/addons/storybook-addon-figma-sync) (overlay, opacity, "Diff only" in red), [Perfect Design](https://www.npmjs.com/package/storybook-addon-perfect-design), [Pixel Perfect](https://npmjs.com/package/pixel-perfect-storybook-addon), [Figma comparator](https://storybook.js.org/addons/sb-figma-comparator) and [Visual Delta](https://storybook.js.org/addons/storybook-addon-visual-delta). None has args→variant mapping, spec redlines, or a CI gate, and Storybook 11-beta support is unverified. Their UX is worth borrowing; building our own is worth it since most of the pieces exist (`commands.ts`, `spec.ts`, `serve.ts`, the panel).

## 2. Args ↔ variant mapping

Declared once in `meta.parameters`, not per story:

```ts
figma: {
    set: `${FIGMA}8696-12170`, // component set
    props: {
        size: { figma: 'Size', values: { sm: 'Small', md: 'Medium', lg: 'Big' } },
        disabled: { figma: 'State', values: { true: 'Disabled' } },
        loading: { figma: 'State', values: { true: 'Loading' } },
    },
    // states that are not args; forced in the preview (see below)
    pseudo: { State: { Hover: 'hover', Pressed: 'active', Focused: 'focus-visible' } },
}
```

- Resolve: current args → `Size=Medium, State=Default` → the child node of the set, found by name in the cached set JSON.
- Figma Code Connect (`figma.enum(...)`) encodes the same mapping. If the kit adopts Code Connect later, read from it so there's one source of truth.
- Non-arg states (hover/pressed/focused): [storybook-addon-pseudo-states](https://npmjs.com/package/storybook-addon-pseudo-states) forces pseudo-classes by rewriting stylesheets, scoped per element via selectors. Storybook 10/11 support is unconfirmed. Alternative: the `FORCED` class map the Button `Matrix` already uses.

## 3. Grid canvas ("Figma matrix")

Let Figma drive the cells: enumerate the set's variants, map each back to args, and render one instance per cell.

- **Recommended layout: mirror the Figma sheet.** Place each instance at its variant's coordinates inside the set frame, then overlay the whole component-set PNG once. One image request per component, one blend layer, and the diff reads like the Figma page designers know. Row and column labels come from the variant props.
- Per-cell status: a thin outline (green/red) plus a mismatch-count badge from live spec checks. Hovering a cell opens its redlines.
- Tests: the `vrt-figma` run screenshots each cell (`[data-figma-cell]`) against the matching region of the set PNG, cropped in the browser canvas like the current flatten step. Results per cell go into the report and the panel.

## Diff visuals: what reads well

- Difference blend for "is anything off"; swipe/onion for "where"; redlines for "by how much".
- pixelmatch heatmap over a faded base (`alpha` ≈ 0.1). Leave anti-aliasing out of the count (`includeAA: false`): AA pixels show yellow and aren't counted. In the Button pilot, 2.4–3.9 % of pixels differed, all on text and corner edges. This could cut the noise sharply; verify before lowering thresholds.
- Same backdrop on both sides, and DPR matching the export scale. Both are already solved: flatten onto the backdrop, `deviceScaleFactor: 2`.
- Kit is dark-only: offer a backdrop switch (white / surface-ground) so semi-transparent fills are judged on a realistic surface.

## Performance and the Figma API

- The images endpoint is Tier 1. People report 429s with huge `Retry-After` values after ~10 image calls ([forum](https://forum.figma.com/report-a-problem-6/rest-api-rate-limit-images-api-returns-429-after-10-requests-cloudfront-49021), [limits](https://developers.figma.com/docs/rest-api/rate-limits)). So: never fetch per Controls change.
- **One images call per component set** (the whole sheet). Crop cells locally from `absoluteBoundingBox` offsets, and batch several sets' ids into one call.
- Disk cache keyed by the file `version`, committed as now. A cheap version check (`/files/:key/meta`) runs only when the user hits Refresh. Cache image bytes, not URLs; the URLs expire.
- The token stays on the Node side (dev route), as now.

## Existing addons vs our custom solution

Registry data checked 2026-11-20 (npm `version`, last publish, peer deps, last-month downloads) plus each README. Our stack: Storybook 11.0.0-beta.3, React 19, Vite, Vitest browser tests in Docker Chromium.

### Figma / overlay diff addons

|  | [Figma Sync](https://www.npmjs.com/package/storybook-addon-figma-sync) | [Visual Delta](https://www.npmjs.com/package/storybook-addon-visual-delta) | [Pixel Perfect (@lagosta)](https://www.npmjs.com/package/@lagosta/pixel-perfect-storybook-addon) | [sb-figma-comparator](https://www.npmjs.com/package/sb-figma-comparator) | Ours (`visual/figma/`) |
| --- | --- | --- | --- | --- | --- |
| Version / last publish | 1.2.2 / 2026-08 | 0.1.5 / 2026-04 | 1.0.11 / 2025-12 | 0.1.7 / 2023-11 | in repo |
| Downloads / month | ~690 | ~20 | small (fork of a 2022 addon) | ~680 | — |
| Storybook 11 + React 19 | Peer `storybook: *`, README says ≥8; 11 untested | Peer `*`; untested | Peer `storybook ^9`, React ≤18: mismatch | SB 7 peers: no | Yes |
| Figma source | Figma API: frame URL pasted in toolbar per story | Local baseline PNGs in `parameters` | Local image `src` | Figma API, URL in `parameters.figma` | Figma API, cached + committed |
| Args/Controls → variant | No (one frame per story) | No | No | No (its "set" means breakpoints) | Planned (mapping in meta) |
| Variant grid / matrix | No; a "Components" drawer lists variants used in a frame | No | No | No | Planned (sheet mirror) |
| Overlay modes | Opacity + toggle; modal: side-by-side, overlay, diff-only | Overlay, difference blend, side-by-side, heatmap | Opacity, invert | Opacity | Side, slider, onion, diff; planned difference blend, swipe, redlines |
| How the "actual" is captured | `html-to-image` (DOM re-rasterised to SVG/canvas, not the real paint) | Needs a custom Chrome extension answering `postMessage` | None (overlay only) | None (overlay only) | Real Chromium screenshot (Playwright, Docker, DPR 2) |
| Pixel numbers | Yes (pixelmatch) | Yes (pixelmatch) | No | No | Yes (pixelmatch, per story; per cell planned) |
| Spec checks (sizes, fonts, colours) | No | No | No | No | Yes (1px tolerance), redlines planned |
| CI / gate | Dev-server endpoint per story; needs Storybook running, 1.2 s delay per story | No | No | No | Vitest project + report page; CI-ready |
| Token handling | `.env` read on Node | n/a | n/a | `STORYBOOK_FIGMA_ACCESS_TOKEN`: the `STORYBOOK_` prefix is bundled into client code, **so the token leaks into static builds/Chromatic** | Node only, never in browser |
| Cache placement | `staticDirs`, so the cache gets copied into `storybook-static` (uploaded to Chromatic) unless excluded | — | — | — | Dev-only route, not in builds |
| Verdict | Closest match. Borrow the ideas (component discovery, iframe auto-size, analysis modal); don't adopt: wrong capture method, no mapping/spec | Not usable (extension dependency) | Usable as a stopgap overlay only; peer mismatch | Don't use (token leak, SB 7) | Keep and extend |

Dead or legacy (Storybook 6/7, React ≤17, last publish 2022–2023): [storybook-addon-perfect-design](https://www.npmjs.com/package/storybook-addon-perfect-design), [pixel-perfect-storybook-addon](https://www.npmjs.com/package/pixel-perfect-storybook-addon) (original), [storybook-addon-pixel-perfect](https://www.npmjs.com/package/storybook-addon-pixel-perfect), [storybook-addon-figma-comparator](https://www.npmjs.com/package/storybook-addon-figma-comparator).

### Figma-related, but not a design diff

| Tool | What it gives | Use? |
| --- | --- | --- |
| [@storybook/addon-designs](https://www.npmjs.com/package/@storybook/addon-designs) 12.0.0 (installed, SB 11 peer) | Figma embed / Figspec in the "Design" tab; no comparison | Keep: the "look at Figma" tab |
| [storybook-addon-pseudo-states](https://www.npmjs.com/package/storybook-addon-pseudo-states) (official, `next` = 11.0.0-beta.3) | Forces `:hover`/`:focus`/`:active` per element by rewriting stylesheets | Adopt for the state grid (hover/pressed/focused cells) |
| Figma Code Connect | Maps code props to Figma variant properties | Optional later: source of truth for the args → variant mapping |
| Chromatic "Visual tests" + Storybook Connect (Figma plugin) | Code-vs-code regression; stories linked inside Figma | Already wired; no Figma diff |

### Recommendation

Keep the custom solution. No addon covers the parts that matter for this kit:

- **Args → variant mapping and the variant grid.** No addon has them.
- **Real-browser capture.** The two addons that compute numbers either re-rasterise the DOM (`html-to-image`: different text rendering, missing inset shadows and filters) or need a browser extension.
- **Spec checks** that survive text anti-aliasing noise.
- **A CI path, and a token that stays server-side.**

From the addons, take the UX ideas: Figma Sync's analysis modal and component discovery, Visual Delta's difference blend and heatmap, and Pixel Perfect's invert toggle. Add `storybook-addon-pseudo-states@next` for forced states. Keep `addon-designs` for the Figma embed.

## Suggested phases

1. Mapping in Button meta + live overlay decorator + panel modes (Difference, Onion, Swipe, Redlines) + "Use Figma content". Drop the dedicated `Figma*` stories.
2. Figma matrix view for Button, mirroring the sheet, with per-cell badges. Pseudo states via the addon or forced classes.
3. `vrt-figma` per-cell runs + `includeAA: false` + report grouped by component/variant.
