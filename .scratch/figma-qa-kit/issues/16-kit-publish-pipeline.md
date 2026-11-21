# 16: Kit publish pipeline

**What to build:** Publishing a GitHub Release publishes the package to GitHub Packages with no stored secret, and a nightly job checks the kit against live Figma.

**Blocked by:** 01 Kit repo skeleton + tracer CI

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Release `published` (`vX.Y.Z`) → `npm publish` with `GITHUB_TOKEN` `packages: write`; prerelease `-next` → `--tag next`
- [ ] Major tag `vN` moved to the release commit
- [ ] Nightly job with a `FIGMA_TOKEN` secret runs `report --refresh` on a fixture against live Figma
- [ ] PR CI remains token-free
