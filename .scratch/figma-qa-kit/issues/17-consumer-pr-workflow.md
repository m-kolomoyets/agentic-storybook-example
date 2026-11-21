# 17: Consumer PR workflow

**What to build:** Consumer repos add a short caller job that uses the kit's reusable workflow to run the Figma report on every PR, post one sticky summary comment and upload the HTML report.

**Blocked by:** 11 --changed + --ci output; 16 Kit publish pipeline

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Reusable `.github/workflows/figma-qa.yml`, referenced `@v1`; kit repo Actions access = organization repos
- [ ] Runs on every `pull_request`, `fetch-depth: 0`, `figma-qa report --ci --changed <base.sha>`; optional `paths` input default empty
- [ ] Kit-pinned Playwright image as `services:` container (`run-server` :3100), tag not an input
- [ ] `FIGMA_TOKEN` passed explicitly; missing → job skipped with notice; 401/403 → comment asks to rotate repo secret
- [ ] Registry auth via `GITHUB_TOKEN` `packages: read`
- [ ] One sticky comment (marker `<!-- figma-qa -->`) created/updated via `gh api`; `pull-requests: write`
- [ ] HTML report artifact `if: always()`, 14-day retention, linked from comment
- [ ] Exit 1 and 2 fail the job; proven on a fixture PR
