# 15: Kit agent skills

**What to build:** The kit ships thin agent skills that call CLI commands and keep only judgment, installed by `init`.

**Blocked by:** 07 Variables naming; 10 Auto-triage + approval snippets; 12 figma-qa init; 14 figma-qa scaffold

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Report skill: scope → `figma-qa report --json` → read per-story results → decide deliberate vs fix → fix code or add an approval for human confirmation
- [ ] Scaffold follow-up skill: rename entries to real code variants, write `renderCell` bodies
- [ ] Variable naming skill: run printed Plugin API script via `use_figma`, feed output to `figma-qa variables`
- [ ] Skills contain no deterministic steps the CLI already does; follow the `writing-for-agents` guidance
- [ ] Installed into both fixtures by `init`; `AGENTS.md` block points at them
