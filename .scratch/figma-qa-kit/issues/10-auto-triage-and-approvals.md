# 10: Auto-triage + approval snippets

**What to build:** Each failing cell carries a deterministic triage category where code can tell (harness / token / value), and the CLI prints a ready-to-paste `approved` entry per failing cell so recording a deliberate deviation is copy-paste plus a reason.

**Blocked by:** 03 Offline report tracer

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] Categories: harness (capture blocked, size differs), token (colour equals another kit token), value (spec number off); otherwise uncategorised
- [x] Category written to results JSON, shown in report + panel
- [x] Per fail cell, CLI output includes a paste-ready `approved` entry (reason placeholder)
- [x] No command rewrites story files
- [x] Fixture has at least one cell per category

## Answer

Done 2026-11-24 in `Phenomenon-Studio/storybook-figma-qa` `main`, commit `c975ed8`. Not pushed yet, so there is no CI run. Typecheck is green. `pnpm test` passes 192/192, including 4 new CLI tests in `test/cli.test.ts` (2 per fixture, sb10 and sb11) and `Triaged` stories for the panel and the report (axe included).

Decisions later tickets need:

- **Results model.** `FigmaCellResult.triage: 'harness' | 'token' | 'value' | null`. It is set only on `fail` cells, by `triageCell` in `figma/triage.ts`, from the browser checks. Every story in the run summary gains `failing: { block, variant, triage, approved }[]`, which `--json` prints too. Ticket 11's `--ci` summary can read triage from there.
- **Rules.** Each rule reads fields, never wording.
  - `harness`: `image.error` is set, which happens when the capture is blocked or the sizes differ. It outranks the spec rows.
  - Otherwise every differing spec row has to be categorised. If any row is not, or if only pixels differ, the cell is uncategorised (`null`). That is where judgment goes.
  - A colour row is one where either side has a `swatch`. It is `token` when Figma's kit tokens and the story's kit tokens are both non-empty and share none.
    - Figma's tokens are the one its bound variable names, falling back to those equal by value.
    - The story's tokens are those equal by value. For a wrong-token row it is the token it is painted with.
    - A story colour that is a kit token, against a Figma colour that no kit token holds, stays uncategorised. This is the fixture's deliberate Neutral.
  - A non-colour row that has a `delta` is `value`. To make this work, the Corner radius row gained a `delta`; it was the only numeric row without one. The icon `Count` row also has a delta, so it counts as `value`.
  - When a cell has both `token` and `value` rows, `token` wins.
- **New field.** `FigmaIssueValue.tokens?: string[]` is the list of kit tokens that a colour side is.
- **Approval entry.** It is a TypeScript literal, `{ when: { <every variant prop>: ['<option>'] }, reason: 'TODO: why this deviation is deliberate (WCAG criterion or decision)' }`, to paste into the named block's `approved`.
  - Harness cells get `approved: null`, and the CLI prints `not measured: fix the capture, no approval can cover it` instead, because `setup.ts` never lets an approval cover a cell it couldn't measure.
  - Nothing rewrites story files. The test checks that the fixture file is byte-identical after a run.
- **Fixtures.** The new `Swatch/Figma triage` (`SwatchTriage.figma.stories.tsx`) exits 1.
  - `Matrix` has four cells:
    - Small Brand is painted with `--color-neutral`, so it is `token`.
    - Large Brand is drawn small, so it is `value`.
    - The two Neutral cells are uncategorised.
  - `Blocked` puts a fixed overlay above the cells that the capture can't hide (`visibility: visible !important`), so all of its cells are `harness`.
  - The "sizes differ" path shares the harness branch but has no fixture cell.
- **Open.** A story whose only failures are `harness` cells still exits 1, because its verdict is `fail`. Spec line 146 reserves exit 2 for harness errors. This is left for ticket 11 to decide alongside the PR comment's "not a design verdict" labelling.

