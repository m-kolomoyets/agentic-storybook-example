# 21: Terminal spec diff per failing cell

**What to build:** Human `report` output shows what differs from Figma under each failing cell, as a git-style diff, without opening the HTML report or the panel. Story 79.

**Blocked by:** 10 Auto-triage + approval snippets

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

Today each failing cell prints `✗ <block> · <variant> [<triage>]` and its `approved` entry, and nothing about why it fails. Each cell's results already hold what is needed:

- `spec.mismatches`: element, property, `expected` (Figma), `actual` (story), `delta`, `tolerance`, `tokens`, `selector`, `contrast`.
- `image`: `ratio`, `maxRatio`, `error`, and the diff `pair` paths.

This ticket is presentation only, with no new measurement.

Target shape (illustrative):

```text
      ✗ swatch · Size=Small, Tone=Brand [token]
        Swatch › Fill                      (±3 per RGB channel)
        - figma  #3B82F6  --color-brand
        + story  #64748B  --color-neutral
        pixels: 31.2% differ (max 1%) → figma-qa/.results/results/…-diff.png
        approved: { when: { … }, reason: 'TODO: …' },
```

- [ ] Under each failing cell, one block per differing spec row:
  - an `<element> › <property>` header with its tolerance;
  - a `- figma <value>` line and a `+ story <value>` line, each with its kit tokens when it has any;
  - the delta, when the row has one.
- [ ] A pixel line under the spec rows:
  - when the cell was measured: the differing share, the max share, and the diff image path relative to the project root;
  - when it wasn't (`harness` cells): `image.error`.
- [ ] Red `-` and green `+` only when stdout is a TTY and `NO_COLOR` is unset. Plain text otherwise, so agents, pipes and CI logs get no escape codes.
- [ ] Long output stays readable: at most N rows per cell (pick N and record it), then `… K more rows in <results file>`.
- [ ] No new flag; `--json` and `run.json` are unchanged. The `--ci` markdown is unchanged unless a later ticket asks for it.
- [ ] The formatter is pure: it takes a cell result and returns lines, it lives beside `figma/triage.ts`, and it is unit-tested, including the colour-off path.
- [ ] Fixture test in both fixtures (sb10 and sb11), running the real CLI: a `token` cell prints Figma's and the story's tokens, a `value` cell prints its delta, a `harness` cell prints its image error, and with stdout not a TTY the output has no escape codes.
- [ ] README "Reading the output" example for `report` updated from a real fixture run (AGENTS.md rule).
