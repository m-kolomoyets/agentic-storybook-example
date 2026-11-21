# 19: Parity check on this repo

**What to build:** Kit `0.x` is published and, on a throwaway branch of this repo, the kit report on the 4 existing Figma stories matches the in-tree report.

**Blocked by:** 07 Variables naming; 08 Local report flow; 09 Run speed; 10 Auto-triage; 13 First-run wizard; 14 figma-qa scaffold; 15 Kit agent skills; 16 Kit publish pipeline. HITL: needs a registry token and Figma token.

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Kit `0.x` released via the publish pipeline
- [ ] Same cells and same verdicts as the in-tree `pnpm vrt figma` run for Button, Checkbox, Radio, Badge
- [ ] Warm run ≤ 25 s wall measured and recorded (not gated)
- [ ] Differences either fixed in the kit or recorded as accepted on this ticket
