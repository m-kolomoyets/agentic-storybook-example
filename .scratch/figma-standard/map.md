# Map: Figma QA standard

Label: wayfinder:map

## Destination

One spec, ready for `/to-spec` → `/to-tickets`, with nothing left to decide, covering:
(a) a one-command **Figma report** for stories, (b) a deterministic kit that installs Storybook + the Figma QA addon + agent rules/skills + scripts into any React + Vite project (Storybook 10 and 11 beta), (c) a faster Figma report run (fetch / spec extraction **and** comparison runtime).

## Notes

- Domain: `storybook-mcp/` only. `amber-fe/` and `amber-pre-start/` are read-only. Vocabulary in `GLOSSARY.md` (Spec extraction, Comparison, Pixel diff, Figma report).
- Every session consults: `phenomenon:figma-qa`, `writing-for-agents`, `storybook-mcp/AGENTS.md` + `.claude/rules/code-style.md`, and the existing `figma-matrix` skill (+ `TRIAGE.md`), `visual/FIGMA-TESTING.md`.
- Kit-related sessions also read the existing `storybook-init`, `storybook-setup`, `storybook-upgrade` skills.
- Plan, don't do: decisions only; any code is a throwaway prototype.
- Baseline: the refactor uncommitted on 2026-11-21 (34 files, +20.5k) is the starting point once committed.
- Code over prose (2026-11-21): anything deterministic lives in the CLI/scripts; skills call them and keep only judgment.
- Settled while charting (2026-11-21):
  - Users: devs run locally + CI runs on PRs; designers read shared output.
  - Kit v1 targets React + Vite, Storybook 10 **and** 11 beta.
  - One command = doctor + browser + sync + variables + test + report + open; non-zero exit on failure. Human-only steps (token, Docker) move to a one-time setup wizard.
  - Story → Figma link lives in the story (`parameters.design`), read by the pipeline; `visual/figma/sets.ts` duplication goes away.
  - Output: HTML report (designers) + Storybook panel, both from one model (as today).
  - Kit target distribution: npm package (addon + vitest plugin + CLI) on a private registry; skills/rules shipped in package and copied on install.
  - Project seam: one optional `figma-qa.config.ts` — see [figma-qa.config.ts shape](issues/09-project-config-seam.md).
  - CI in v1: every PR, scoped by `--changed` import graph (no path filter, per GitHub Actions ticket) → summary comment + HTML artifact.
  - Variable names: research alternatives first; fallback = match colors to tokens by resolved value.
  - QA kit versioning (2026-11-21): semver; any `figma-qa.config.ts` or committed refs format change = major; a major ships a `figma-qa migrate` step that `init` runs on upgrade. Spec writes it up; no ticket.

## Decisions so far

- [Variable names without the Enterprise REST scope](issues/02-variable-names-without-rest.md): no non-Enterprise CI route for id→name; keep Plugin API (`use_figma`) for new ids only, run by agent in-session; CI reads committed `variables.json`, falls back to value match as warning. Optional: design fills `codeSyntax.WEB`.
- [Figma REST fetch: depth, geometry, batching, caching, limits](issues/03-figma-fetch-optimization.md): `/meta` `version` = cache key; unchanged → zero Tier-1 calls (keep raw `/nodes` JSON locally so `--refresh` rebuilds offline); changed → one full `/nodes` (no depth/geometry) + per-set subtree hash → `/images` only for changed sets. Token owner needs Dev/Full seat on kit file's plan.
- [Storybook 10 / 11-beta packaging mechanisms for the kit](issues/04-storybook-kit-packaging.md): one ESM package, peer `storybook ^10.6.0 || ^11.0.0-0`; exports `./preset` (viteFinal route), `./manager`, `./preview` (`definePreviewAddon`), `./vitest`, CLI `init` (own init — `storybook add` skips postinstall for 3rd-party), bundled `skills/`. Under `definePreview` preset previewAnnotations ignored. Risks: Node 22.12 / Vite 6.3 min, `storybook/internal/babel` gone in 11, no `setProjectAnnotations` in setup file on 11.
- [Commit the in-progress refactor as baseline](issues/01-commit-baseline.md): baseline = `fb014c7` on `ci/storybook-tests`; tree clean. Unblocks profiling.
- [Profile a Figma report run](issues/05-profile-report-run.md): 56.7 s warm; screenshots ≈90 % of per-cell time, Vitest startup 28 %, spec/report < 3 %. Cut: one capture per cell, collect only figma stories, cache flat refs; no block-capture/sharding yet; warm run only.
- [Story → Figma mapping via parameters.design](issues/06-story-figma-mapping.md): `design` entries (named by code variant, one per component set) are the only URL source; blocks reference them by name; `figma` tag = discovery; lazy `figmaEnsureSets` command replaces `sets.ts`, cache-only fallback offline; one kit file norm, no file-key config.
- [One-command report flow](issues/07-report-flow.md): `figma-qa report` (+ doctor/init/variables), never prompts, auto Docker else host-browser banner; exit 0/1/2, warnings never fail; no a11y; `--changed`, `--ci`, `--json`; auto-triage by code, approvals stay agent edits.
- [Kit packaging and install into existing Storybook](issues/08-kit-packaging-decision.md): one package; `pnpm dlx <kit> init` does install + merge (magicast) + skills via `npx skills add` + `AGENTS.md` marked block + wizard; refuses SB < 10.6 / non react-vite, bootstraps no-Storybook; idempotent, `--dry-run`; never touches stories/git/CI; Node ≥ 22.12.
- [Choose and provision the private registry](issues/10-registry-provisioning.md): GitHub Packages, `@phenomenon-studio/storybook-figma-qa`; publish from a `Phenomenon-Studio` repo via Actions `GITHUB_TOKEN` (no stored secret); consumers need `.npmrc` + `read:packages` PAT / granted `GITHUB_TOKEN`, even before `dlx init`.
- [figma-qa.config.ts shape](issues/09-project-config-seam.md): optional; keys `tokens.prefix`, `tokenName()`, `icons{glob,name}`, `refsDir`, `maxDiffRatio`. Tokens read from CSSOM, icons `?raw` via plugin virtual module; backdrop/QA theme/`FORCED` pins not config.
- [Faster Figma report run: fetch + comparison design](issues/11-faster-run-design.md): refs committed (+ per-set subtree hash/version), raw `/nodes` + flat refs in gitignored `node_modules/.cache/figma-qa/`, no CI cache; one screenshot/cell → Node `figmaPixelDiff` (memoized flatten, pipelined, awaited per story); diff map once in Node; static `figma`-tag scan → Vitest `include`; target ≤ 25 s warm for 4 stories, timings reported, not gated.
- [First-run setup wizard contents](issues/12-first-run-wizard.md): wizard = doctor checks + prompts for missing human fixes; prompts only `FIGMA_TOKEN` (validated `/v1/me` + `/meta`, `.env.local` only if ignored) and Y/n image pull; registry auth via docs `gh` one-liner → user `~/.npmrc`, project `.npmrc` scope line only; MCP info only; `--yes` = no prompts/secrets/pull, checklist, exit 0.
- [Kit source repo and migrating this repo onto the kit](issues/13-kit-repo-and-migration.md): new org monorepo `Phenomenon-Studio/storybook-figma-qa` (package + `fixtures/sb10|sb11`), created by first impl ticket; staged migration: build + publish 0.x, parity on 4 stories, one cutover PR (init, delete `visual/figma`, `git mv` refs → `figma-qa/__refs__`); `pnpm vrt figma` dropped; DIY/Argos/Chromatic stay, outside kit.
- [GitHub Actions workflows: kit publish + consumer PR check](issues/14-github-actions.md): reusable workflow `figma-qa.yml@v1` (caller snippet in docs/init checklist); every PR, `--changed base.sha`, Playwright `services:` image; per-repo `FIGMA_TOKEN` (tech lead PAT, expiry → exit 2 + rotate message); sticky `gh api` comment, artifact 14 d; kit CI offline fixture matrix + nightly live, publish on Release, moves `vN` tag.
- [Scaffold a Figma story from a UI-kit page](issues/15-story-scaffolding.md): `figma-qa scaffold <url...> --story <path>` writes kit-owned `<C>.figma.stories.tsx` (title = sibling + `/Figma`, `figma` tag); names = kebab set name, layout State→columns/Size→sections, `renderCell: () => null` stub; re-run appends by nodeId only; needs live token, warms refs; skill renames + writes cells.

## Not yet specified

<!-- empty: all fog graduated; all tickets resolved (2026-11-21) — map ready for /to-spec -->

## Out of scope

- Frameworks other than React + Vite (Next.js etc.); Storybook < 10. New adapter = new effort.
- Hosting the designer-facing HTML report (Pages / S3 / Chromatic): v1 serves designers via the CI artifact + local open; hosting is a new effort.
- Designer self-service (running the report without a dev environment): needs a hosted runner/app; new effort.
