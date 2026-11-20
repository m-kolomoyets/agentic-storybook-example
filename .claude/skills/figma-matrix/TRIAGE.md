# Triage: failing Figma cells

Read a failing cell in `visual/.results/figma/results/<storyId>.json` (`spec.mismatches`, `image`) or in the Figma diff tab. Spec lines name the property; when the spec is clean, the diff image (`files.diff`) does: red pixels differ, yellow are anti-aliasing.

## Classes

| Class | Means | Owner |
| --- | --- | --- |
| **structure** | Element missing, extra or reordered; a glyph or label Figma draws and the code doesn't. | Component markup (`index.tsx`) |
| **behaviour** | One state (hover, pressed, focused, disabled, loading, selected) differs while its siblings match. | State classes in `utils/variants.ts`, or the story's `FORCED` pin |
| **value** | Measurable mismatch beyond tolerance: size, padding, gap, radius, font. | `utils/variants.ts` classes, spacing/type tokens |
| **token** | Colour or value near Figma but from a different source: small channel drift on fills/text across a set. | `src/styles/tokens.css` (generated from Figma), `tokens-supplement.css` |
| **mapping** | The cell renders the wrong variant or content: `renderCell` mapped an option wrong, or the label/glyph didn't come from Figma. | The matrix story |
| **harness** | Measurement artefact: wrapper size, frame, fonts, animation. | The story wrapper or `visual/figma/` |

## Reading the signals

| Signal | Usual class | Check |
| --- | --- | --- |
| `icons: N rendered ≠ Figma M` | structure, or mapping | `figmaContent(variant)` used; the kit SVG exists (`src/assets/icons/<kebab-name>.svg`; `KitIcon` renders nothing for unknown names); a loading cell swaps glyphs for spinners on purpose. |
| `text "…" not rendered` | mapping | Label taken from `figmaContent(variant).text`, not a fixed string. |
| `text … x/width` | value | Padding or gap token; letter spacing. A uniform offset on every cell of one size is a padding token. |
| `font … not loaded` | harness | Font face missing for that weight. |
| `root size W×H ≠ Figma` | value, or harness | Size classes in `utils/variants.ts`. A wrapper adding height (a block group around an inline control) is harness: make it `flex`. |
| `root radius … ≠ Figma` and pixels pass | harness | Figma paints the box on a deeper frame; check the variant's `spec.root` in the manifest against Figma. |
| `root background` / `color` lines | token or value | Colours print as kit HSL with the nearest token per side: `[= --alias → --primitive]` exact, `[≈ … (Δn)]` nearest with the largest channel difference. **Same token both sides, Figma `≈ (Δn)`**: the token's value drifted from Figma; fix it in `tokens.css` (regenerate) or the supplement. **Different tokens**: the component uses the wrong one; fix the class in `utils/variants.ts`. **Figma `≈` with a large Δ and no plausible token**: Figma uses a colour the kit lacks; add it to the supplement or ask design. |
| Same colour off by a lot, one state column only | behaviour | The state class or the `FORCED` pin uses a different token than Figma's state. |
| Every cell of a set off by a similar amount | token | One shared token. |
| `Expected image dimensions …`, spec clean | harness | The measured root isn't Figma's box; check the first element inside `[data-figma-variant]`. |
| Magenta boxes in the diff | none | Text masks, painted identically on both sides: text is judged by the spec lines, not pixels. |
| `… (±Npx)` on a size or position line | value | The line already includes the text-advance allowance; drift beyond it is real. |
| Spec clean, solid areas in the diff | behaviour or value | Shadow, stroke, fill opacity, wrong icon: open the cell in the panel, _Swipe_ or _Difference_. |
| Spinner cells a few percent off | harness | Animation frame (FIGMA-TESTING.md → Limits). |

## Deliberate drift

Before reporting value/behaviour drift as a bug, search the component for the reason: comments in `utils/variants.ts` and `index.tsx` that cite a Figma node, WCAG criterion or ADR. A documented reason makes the cell an approval candidate:

```ts
approved: [{ when: { State: ['Focused'] }, reason: 'Figma <node> draws no focus stroke; added (WCAG 2.4.7).' }];
```

`when` lists Figma property values; omitted properties match every option. Propose; the user confirms.
