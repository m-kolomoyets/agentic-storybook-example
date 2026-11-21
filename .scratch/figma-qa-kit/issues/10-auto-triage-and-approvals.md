# 10: Auto-triage + approval snippets

**What to build:** Each failing cell carries a deterministic triage category where code can tell (harness / token / value), and the CLI prints a ready-to-paste `approved` entry per failing cell so recording a deliberate deviation is copy-paste plus a reason.

**Blocked by:** 03 Offline report tracer

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Categories: harness (capture blocked, size differs), token (colour equals another kit token), value (spec number off); otherwise uncategorised
- [ ] Category written to results JSON, shown in report + panel
- [ ] Per fail cell, CLI output includes a paste-ready `approved` entry (reason placeholder)
- [ ] No command rewrites story files
- [ ] Fixture has at least one cell per category
