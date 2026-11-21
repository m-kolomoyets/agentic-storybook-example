# 07: Variables naming + value-match fallback

**What to build:** Figma colours bound to variables are compared against CSS tokens by name when names are known (committed `variables.json`), and by resolved value as a labelled guess when not. `figma-qa variables` lets an agent name new variable ids in one in-session step.

**Blocked by:** 04 Figma sync with REST stub; 06 Project config seam

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Named ids map through `tokenName` to CSS tokens; "right value, wrong token" reported
- [ ] Unnamed ids → value-match rows labelled guess + one warning line (count + "name via `figma-qa variables`"); never changes exit code
- [ ] `figma-qa variables` prints the Plugin API script for unnamed ids only and merges pasted/file output into committed `variables.json`
- [ ] Merge is idempotent; existing names untouched
