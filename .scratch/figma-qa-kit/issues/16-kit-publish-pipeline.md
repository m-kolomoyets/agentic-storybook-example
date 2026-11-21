# 16: Kit publish pipeline

**What to build:** Publishing a GitHub Release publishes the package to GitHub Packages with no stored secret, and a nightly job checks the kit against live Figma.

**Blocked by:** 01 Kit repo skeleton + tracer CI

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] Release `published` (`vX.Y.Z`) → `npm publish` with `GITHUB_TOKEN` `packages: write`; prerelease `-next` → `--tag next`
- [x] Major tag `vN` moved to the release commit
- [x] Nightly job with a `FIGMA_TOKEN` secret runs `report --refresh` on a fixture against live Figma
- [x] PR CI remains token-free

## Answer

Done 2026-11-21 in `Phenomenon-Studio/storybook-figma-qa` `main` (`649531d`, `d32d5af`); CI run 44909377582 green on all 4 cells at `6bce81d` (proves `ci.yml` with `workflow_call`). Release `v0.0.0` (publish run 44912318208, green): CI gate passed, `@phenomenon-studio/storybook-figma-qa@0.0.0` published to GitHub Packages (40 files), `v0` moved to `6bce81d`. `nightly.yml` still unexercised. Workflows pass actionlint + shellcheck; the release-resolve script was run locally against 7 tag/version/prerelease cases; `npm pack --dry-run` holds only `dist/` + `skills/`.

- `publish.yml` on Release `published`: reruns `ci.yml` (now also `workflow_call`) on the release commit, then `npm publish` with `GITHUB_TOKEN` (`packages: write`), then force-moves `vN` (`contents: write`).
- Tag, version and prerelease flag must agree or publish fails before anything ships: `vX.Y.Z` + Release → `latest`, `vX` moved; `vX.Y.Z-next.N` + Pre-release → `next`, `vX` untouched. Other prerelease identifiers are refused.
- Known limit: a stable backport (1.2.4 after 1.3.0) would pull `latest` and `v1` back. No backport policy exists; add a highest-in-major guard if one appears.
- A tag ruleset protecting `v*` would block the `vN` force-push.
- `pnpm/action-setup` is SHA-pinned in jobs that hold write tokens or `FIGMA_TOKEN`; `ci.yml` stays on `@v4` (read-only, no secrets).
- `nightly.yml`: gate job skips with a notice when `FIGMA_TOKEN` is unset; the token is scoped to the report step only. Runs `figma-qa report --refresh --ci` in `fixtures/sb11` only (ticket asks for one fixture; live Figma is not Storybook-major-specific).
- Nightly is red until `report --refresh` exists (03/04). It has no `--host-browser`: refs come from the kit-pinned Playwright image, so the ticket that pins that image must add it as a `services:` container to this job (same as 17's consumer workflow).
- PR CI stays token-free: `ci.yml` references no secrets and publish calls it without `secrets: inherit`.
