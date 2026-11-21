# One-command report flow

Type: grilling
Status: resolved
Blocked by: 02, 06

## Question

Define `pnpm figma-report` end to end: which of today's ~10 first-run steps are cut, automated, or moved to the setup wizard; how the variables step behaves (per ticket 02); flags (scope to stories, refresh, CI mode); exit codes and what counts as failure; what opens at the end; a11y (`test-run`) inclusion or not; the agent-facing flow (skill wording) vs human CLI.

## Answer

Grilled with the human, 2026-11-21. Standing rule from this session: **anything deterministic lives in the CLI; skills only call it and keep judgment.**

- **Surface**: kit CLI `figma-qa` with `report` (default), `doctor`, `init` (wizard, the only place that prompts), `variables`. Project script alias `pnpm figma-report` → `figma-qa report`. `pnpm vrt figma` lives on in this repo only until migration.
- **Flow**: doctor → browser → lazy sync (per Story → Figma mapping) → tests → report → open. Never prompts: no token + complete cache → offline run; anything missing it can't work around → exit 2 pointing at `figma-qa init`.
- **Browser**: auto-start pinned Docker Chromium (`compose up --wait`) if Docker exists; no Docker locally → host Chromium with a "host browser: pixels not comparable to CI" banner in report + summary. CI: pinned image only.
- **Exit codes**: 0 = every cell pass/approved/no-code; 1 = any fail cell; 2 = harness/setup error (doctor blocked, misconfigured Figma story, set not cached, browser unreachable in CI). Warnings never fail: unnamed variables, host browser, Figma changed since sync.
- **Figma changed since sync**: warn only; adopting is an explicit `--refresh` commit.
- **Variables**: never block; one warning line (count + "name via `figma-qa variables`"), value-match fallback rows. Naming stays agent-driven via `use_figma` (no REST route), CLI prints script + merges.
- **a11y**: excluded; stays in `test:storybook` / MCP `test-run`.
- **Flags**: positional filters (component name / story-id glob), `--changed [base]` (git diff → affected Figma stories via import graph; replaces skill scope step, used by CI on PRs), `--refresh`, `--ci` (no open, no Docker start, markdown summary file for PR comment, HTML report as artifact), `--host-browser`, `--no-open`, `--json` (summary on stdout). No `--update`, no tolerance flags.
- **End**: local TTY opens the HTML report; prints Storybook "Figma diff" URL if Storybook is up. Nothing opens in CI / `--no-open`.
- **Auto-triage**: code pre-classifies each fail cell into its TRIAGE category where deterministic (harness: capture blocked / size differs; token: colour equals another kit token; value: spec number off), written to results JSON + report. Skill decides only deliberate-vs-fix.
- **Approvals**: agent edits the story, human confirms; no AST-rewriting `approve` command. CLI prints a ready-to-paste `approved` entry per fail cell.
- **Agent path**: one entry point. Skill = scope → `figma-qa report --json` → read `results/<storyId>.json` → triage judgment → act.

Glossary: added **Approval**.
