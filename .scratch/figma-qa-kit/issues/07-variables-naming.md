# 07: Variables naming + value-match fallback

**What to build:** Figma colours bound to variables are compared against CSS tokens by name when names are known (committed `variables.json`), and by resolved value as a labelled guess when not. `figma-qa variables` lets an agent name new variable ids in one in-session step.

**Blocked by:** 04 Figma sync with REST stub; 06 Project config seam

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] Named ids map through `tokenName` to CSS tokens; "right value, wrong token" reported
- [x] Unnamed ids → value-match rows labelled guess + one warning line (count + "name via `figma-qa variables`"); never changes exit code
- [x] `figma-qa variables` prints the Plugin API script for unnamed ids only and merges pasted/file output into committed `variables.json`
- [x] Merge is idempotent; existing names untouched

## Answer

Done 2026-11-24 in `Phenomenon-Studio/storybook-figma-qa` `main`, commit `69b1739`. Not pushed yet, so there is no CI run. Typecheck is green on the kit and both fixtures. `pnpm test` passes 186/186, including 10 new CLI tests in `test/variables-cli.test.ts` (5 per fixture, sb10 and sb11).

Decisions later tickets need:

- **"Right value, wrong token" is detected through the cascade, not by value.** A computed colour can't say which of several equal tokens produced it. For a bound colour that matches Figma (so it has no row yet), `usesToken` (`figma/colors.ts`) does the check. It sets the expected token to a sentinel colour, `!important` and inline, on the measured element and every ancestor, so aliases declared higher up re-resolve. It then re-reads the computed properties and restores each `style` attribute exactly, all synchronously.
  - The resulting row has tolerance `painted with <token>`. Its received note names the token the story used instead (`= --color-primary`), or says `not a kit token`.
  - The check covers the root background, root stroke, text colour and icon colour.
  - A story that paints with an alias of the expected token counts as using it.
- **Guess rows.** These are unnamed ids, and names whose `tokenName` gives null or a token the kit lacks. Their note reads like `var 1:2 (unnamed) · guess ≈ --color-x (Δn)` or `var Tone/Neutral · no kit token --color-tone-neutral · guess …`. There is no token check for them.
- **Warning.** The run carries one line: `N Figma variables are unnamed: rows bound to them are matched by value (a guess). Name them via \`figma-qa variables\`.` It is computed once in `report`'s summary over every manifest in `refsDir`, not only the sets the run used, so the count matches what `figma-qa variables` names. It counts all bound ids, lengths included. Named ids with no kit token are not counted, because naming them wouldn't help. The exit code never changes.
- **`figma-qa variables` contract.**
  - With no argument, it prints one script per Figma file to stdout, each headed by a `//` comment naming the fileKey. When nothing is unnamed, stdout is empty and stderr says so.
  - The script returns `{ variables: { [id]: { collection, type, name } }, missing: [id] }`.
  - `figma-qa variables <file>` or `-` (stdin) merges that output. Any other shape exits 2 and writes nothing.
  - Committed names are never changed. A merge with nothing new writes nothing, so the file stays byte for byte.
  - `source.updatedAt` and `source.via` change only when something is added.
  - `missing` ids are printed and stay unnamed.
  - Ids that no manifest binds are still accepted.
- **Fixtures.**
  - Swatch's Brand fill is now bound to `1:1` (`Brand`, which maps to `--color-brand`). Neutral stays bound to `Tone/Neutral`, which has no kit token. The recordings and refs were regenerated with `scripts/fixture-refs.mjs`.
  - New `--color-primary` token, with the same value as brand.
  - `Swatch` gained a `token` prop.
  - New story `Swatch/Figma token` (`SwatchToken.figma.stories.tsx`), which exits 1. Its Brand cells fail as a wrong token.
  - The tests unname ids by rewriting `variables.json` and restore it afterwards.
- **Not done.** The agent skill text for naming belongs to ticket 15. `figma-qa doctor` has no variables-naming line yet; that belongs to ticket 13's wizard.
