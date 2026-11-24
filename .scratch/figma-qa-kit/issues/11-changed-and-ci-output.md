# 11: --changed + --ci output

**What to build:** A run can be scoped to Figma stories affected by a git diff, and a CI mode produces a markdown summary and an artifact-ready HTML report without opening anything.

**Blocked by:** 08 Local report flow

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] `--changed [base]`: git diff vs base → import graph → affected Figma stories; nothing affected → exit 0 with "no Figma stories affected"
- [x] `--ci`: no open, no Docker start, writes markdown summary file (per-story pass/fail/approved counts, triage category, harness errors labelled "not a design verdict") + HTML report dir
- [x] Fixture test: change one component → only its Figma story runs

## Answer

Done 2026-11-24 in `Phenomenon-Studio/storybook-figma-qa` `main`, commit `b0a6119`. Not pushed yet, so there is no CI run. Typecheck is green on the kit and both fixtures. `pnpm test` passes 209/209, including `test/changed-ci.test.ts` (real CLI in `fixtures/sb10` and `fixtures/sb11`) and `test/ci-summary.test.ts` (the pure markdown builder).

Decisions later tickets need:

- **`--changed [base]`** is Vitest's own `changed` (`createVitest({ changed })` + `getRelevantTestSpecifications()`), in both majors.
  - Changed files are `git diff --name-only base...HEAD` (merge-base) plus staged, unstaged and untracked files. With no base, only the uncommitted ones count.
  - Each story file's import graph then decides which files are affected; the static `figma` tag scan and the filters still apply on top.
  - Some changes reach every story without being imported. The CLI adds them to Vitest's `forceRerunTriggers`: `.storybook/**`, the refs dir and `figma-qa.config.ts`. Vitest's defaults (`package.json`, Vite / Vitest config) also apply. So a refs-refresh PR reruns everything.
  - The base is verified first with `git rev-parse --verify <base>^{commit}`. Vitest 4 ignores git's exit code, so an unknown base used to read as "nothing changed" and pass. An unknown base, or no repository, is exit 2. Ticket 17 needs `fetch-depth: 0` (already in the spec) or the base SHA fetched.
  - Nothing affected is exit 0 with the warning `No Figma stories affected.`
  - Syntax: `--changed <base>` or `--changed=<base>`. A following non-option argument is the base, so filters go before the flag.
  - The test runs against a throwaway git repo over the fixture (`GIT_DIR` + `GIT_WORK_TREE`), so the kit repo's history and local edits never decide what runs.
- **`--ci`** implies `--no-open` and never calls Docker.
  - The browser is `FIGMA_QA_BROWSER_WS` when the workflow sets it. Ticket 17 sets it to the service container, `ws://127.0.0.1:3100/` with no token path. Otherwise host Chromium runs, with the warning `Host Chromium (--ci without FIGMA_QA_BROWSER_WS): …`. `--host-browser` still wins.
  - It writes `figma-qa/.results/summary.md` (`CI_SUMMARY_FILE`) next to `run.json` and `report/`, for both `--json` and human output.
- **Markdown** (`ciSummary` in `src/node/ci-summary.ts`, built from the run summary alone):
  - It starts with the `<!-- figma-qa -->` marker line, then `## Figma QA: <headline>`.
  - The headline is `pass`, `fail`, or `harness or setup error (not a design verdict)` for exit 2. A run with exit 1 whose only failing cells are `harness` reads `cells not measured (not a design verdict)`.
  - Next come the totals and a per-story table with Story, Verdict, Pass, Fail, Approved, Missing and Triage. Triage looks like `token 1 · value 1 · uncategorised 2`, or `harness N (not a design verdict)`; an errored story shows dashes and `not a design verdict`.
  - Then an `Errors (not a design verdict)` list, a `<details>` list of failing cells, and warnings.
  - A token error (message starting with `TOKEN_REJECTED`, `Figma rejected FIGMA_TOKEN`) adds "rotate the `FIGMA_TOKEN` repository secret".
  - **The artifact link is ticket 17's.** The CLI doesn't know the artifact URL, so the workflow appends it to the file before posting.
- **Harness-only stories still exit 1.** Ticket 10 left this open. The verdict model is unchanged: a `harness` cell is a fail cell. Only the PR summary's wording separates them. Revisit if CI noise shows it matters.
- **Not done.** The host-browser warning under `--ci` still ends "pixels are not comparable to CI", which reads oddly inside CI. Ticket 17 makes that path the exception, by always setting `FIGMA_QA_BROWSER_WS`.

