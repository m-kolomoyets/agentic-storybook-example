# 20: Cutover PR in this repo

**What to build:** This repo switches from its in-tree Figma pipeline to the published QA kit in one PR.

**Blocked by:** 17 Consumer PR workflow; 18 figma-qa migrate + upgrade hook; 19 Parity check on this repo

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Project `.npmrc` scope line + `init` run
- [ ] The 4 Figma stories moved to sibling `<Component>.figma.stories.tsx` with named `parameters.design` entries + `figma` tag; set registry removed
- [ ] In-tree Figma pipeline deleted; refs `git mv` to `figma-qa/__refs__`; `--refresh` if refs format changed
- [ ] Amber token quirks moved into this repo's `tokenName`
- [ ] `pnpm vrt figma` removed; old `figma-matrix` skill replaced by kit skills
- [ ] Consumer caller workflow added
- [ ] DIY / Argos / Chromatic experiments untouched
- [ ] `figma-qa report` exit 0 on the PR
