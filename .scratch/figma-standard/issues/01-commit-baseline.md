# Commit the in-progress refactor as baseline

Type: task
Status: resolved
Blocked by: —

## Question

The `storybook-mcp` working tree holds an uncommitted refactor (34 files, +20.5k/−1.1k: view.ts, a11y.ts, issues.ts, diff-map.ts, results.ts, variables.ts, …). Tickets that read or profile pipeline code need a stable baseline. Commit it (HITL: the human decides commit shape/branch). Done = clean `git status` for `visual/` + `.storybook/`; record the commit SHA in the answer.

## Answer

Already done by the human before this session. Baseline = `fb014c7b` "feat(figma): unify diff map and share tile lightbox" on branch `ci/storybook-tests` (68 files, +25.1k/−1.1k; includes `view.ts`, `a11y.ts`, `issues.ts`, `diff-map.ts`, `results.ts`, `variables.ts`, `__refs__/variables.json`, `runs.jsonl`). `git status visual .storybook` clean on 2026-11-21. Profiling (05) runs against this SHA.
