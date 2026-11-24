# 18: figma-qa migrate + upgrade hook

**What to build:** Upgrades are safe: refs and config record their format version, and `init` runs `figma-qa migrate` when the installed kit version changes.

**Blocked by:** 12 figma-qa init

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Refs format version recorded with committed refs
- [ ] Migration runner with an ordered, initially empty set of steps; no-op when up to date
- [ ] `init` detects a version change and runs migrate, then re-installs skills when their hash changed
- [ ] Semver policy (config/refs format change = major) documented in the kit README
- [ ] README "Reading the output" gains `migrate`: a real fixture run and how to read it (AGENTS.md rule)
