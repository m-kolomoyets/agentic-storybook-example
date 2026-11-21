# 05: Results model → panel + HTML report

**What to build:** Developers see results in the Storybook "Figma diff" panel and designers in a standalone HTML report, both rendering the same results model. The diff map is computed once in Node when results are written.

**Blocked by:** 03 Offline report tracer

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Diff map computed once in Node and persisted in results JSON; panel and report only render it
- [ ] Manager panel reads results through one shared QueryClient; works on Storybook 10 and 11 fixtures
- [ ] HTML report directory written per run
- [ ] Stories for panel + report fed fixed results (pass, fail, approved, harness error, host-browser banner, Figma-changed warning) with play functions + axe; all pass
- [ ] Report and panel show identical verdicts for the same results
