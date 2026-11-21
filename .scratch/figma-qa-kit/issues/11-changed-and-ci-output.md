# 11: --changed + --ci output

**What to build:** A run can be scoped to Figma stories affected by a git diff, and a CI mode produces a markdown summary and an artifact-ready HTML report without opening anything.

**Blocked by:** 08 Local report flow

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] `--changed [base]`: git diff vs base → import graph → affected Figma stories; nothing affected → exit 0 with "no Figma stories affected"
- [ ] `--ci`: no open, no Docker start, writes markdown summary file (per-story pass/fail/approved counts, triage category, harness errors labelled "not a design verdict") + HTML report dir
- [ ] Fixture test: change one component → only its Figma story runs
