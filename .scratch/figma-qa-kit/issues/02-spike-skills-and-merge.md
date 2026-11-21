# 02: Spike: skills add from local path + magicast merge on SB 11 definePreview

**What to build:** De-risk the two unknowns `init` depends on. Answer, with a throwaway run against the fixtures: does `npx skills add <installed-package>/skills --copy -y` install skills from a local package path into `.agents/skills` + `.claude/skills` with `skills-lock.json`; and can magicast add the kit addon to a CSF Next `definePreview({ addons })` preview, `main` addons, and a Vitest config with projects, on both Storybook majors.

**Blocked by:** 01 Kit repo skeleton + tracer CI

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Written result per question (works / fails + why) recorded as a comment on this ticket
- [ ] If local-path `skills add` fails: fallback (copy into `.agents/skills/` + symlink into `.claude/skills/`) confirmed workable
- [ ] List of config shapes magicast can merge safely vs shapes that must fall back to printing a snippet
- [ ] No spike code merged into the package
