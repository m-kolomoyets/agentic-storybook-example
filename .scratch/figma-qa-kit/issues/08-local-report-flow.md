# 08: Local report flow

**What to build:** `figma-qa report` behaves as the one local command: it picks a browser, collects only Figma stories, honours filters, reports phase timings, and opens the result.

**Blocked by:** 03 Offline report tracer; 05 Results model → panel + HTML report

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Docker present → pinned browser image started (`compose up --wait`); absent or `--host-browser` → host Chromium + "pixels not comparable to CI" banner in report and summary (warning only)
- [ ] Static scan of story files for a `figma` tag literal → Vitest `include`; non-literal tags → file included
- [ ] Positional filters (component name / story-id glob) intersect the scanned list
- [ ] Local TTY opens the HTML report; prints panel URL when Storybook is up; `--no-open` opens nothing
- [ ] Phase timings in `--json` and in the report
- [ ] Never prompts; doctor-blocked state → exit 2 pointing at `figma-qa init`
- [ ] Project alias `figma-report` documented
