# GitHub Actions workflows: kit publish + consumer PR check

Type: grilling
Status: resolved
Blocked by: 13

## Question

Two workflows. (1) Kit repo: fixture matrix (SB 10.6 + 11-next, Node 22.12), publish to GitHub Packages with `GITHUB_TOKEN` `packages: write`, release trigger. (2) Consumer PR check: path filter `src/components/ui`, `figma-qa report --ci --changed <base>`, pinned browser image wiring, registry auth (`packages: read` + Manage Actions access), PR summary comment format (create vs update one comment), HTML report artifact, exit-code handling (1 vs 2). `init` never touches CI files (Kit packaging decision): ship the consumer workflow as printed snippet, docs template, or reusable workflow (`uses: Phenomenon-Studio/...`)?

## Answer

Grilled with the human, 2026-11-21.

**Consumer PR check**
- **Delivery**: reusable workflow `Phenomenon-Studio/storybook-figma-qa/.github/workflows/figma-qa.yml@v1` (major tag tracks kit major; same pattern as `phenomenon-configs`). Consumer adds a ~10-line caller job; docs + `init`'s final checklist print the caller snippet (`init` still never writes CI files). Kit repo setting: Actions access "accessible from repositories in the organization".
- **Trigger/scope**: every `pull_request`, no `paths:` filter; `figma-qa report --ci --changed ${{ github.event.pull_request.base.sha }}`, `fetch-depth: 0`. Import graph decides; nothing affected → exit 0. Optional `paths` input (default empty) for projects wanting a cheaper skip.
- **Browser**: job `services:` container with the kit-pinned Playwright image (`run-server` on :3100); tag owned by the kit, not a workflow input. Vitest on the runner connects to `ws://localhost:3100`, same as local Docker.
- **Figma token**: per-consumer-repo secret `FIGMA_TOKEN` (not org-level: projects/people differ), passed explicitly, not `secrets: inherit`. Owner = project tech lead's PAT (Dev/Full seat on the kit file's plan, `file_content:read` + `file_metadata:read`). No shared bot account. Missing secret (Dependabot/forks) → job skipped with notice. 401/403 → exit 2, comment "Figma token rejected (expired or revoked) — rotate repo secret `FIGMA_TOKEN`". No expiry tracking (not detectable). Kit docs ship a rotation checklist (new token → `gh secret set FIGMA_TOKEN` → re-run). Local `.env.local` token independent of CI's; cache key is file `version`, so output identical.
- **Registry auth**: `GITHUB_TOKEN` `packages: read` + consumer repo granted in package "Manage Actions access" (per registry ticket).
- **Exit codes**: 1 and 2 both fail the job; comment distinguishes "N cells differ from Figma" vs "harness error: <reason>, not a design verdict". Not a required check in v1; branch protection is the repo owner's call.
- **PR comment**: one sticky comment (hidden marker `<!-- figma-qa -->`) created/updated via `gh api`, no 3rd-party action; body = `--ci` markdown summary (per-story cells pass/fail/approved, triage category, artifact link). Later run with nothing affected → update to "no Figma stories affected". `permissions: pull-requests: write`.
- **Artifact**: HTML report dir, `if: always()`, 14-day retention, linked from the comment.

**Kit repo**
- **CI** (push/PR): matrix `fixtures/sb10` × `fixtures/sb11` on Node 22.12 + current LTS; `init --yes` into fixture, then `figma-qa report` offline against committed fixture refs + cached nodes (no `FIGMA_TOKEN`, no seat dependence). One nightly job with a token checks live Figma.
- **Publish**: on GitHub Release `published` (`vX.Y.Z`): `npm publish` with `GITHUB_TOKEN` `packages: write`; moves the `vN` major tag for the reusable workflow. Prerelease (`-next`) → `--tag next`.
