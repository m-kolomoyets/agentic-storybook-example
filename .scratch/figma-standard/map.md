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
- Settled while charting (2026-11-21):
  - Users: devs run locally + CI runs on PRs; designers read shared output.
  - Kit v1 targets React + Vite, Storybook 10 **and** 11 beta.
  - One command = doctor + browser + sync + variables + test + report + open; non-zero exit on failure. Human-only steps (token, Docker) move to a one-time setup wizard.
  - Story → Figma link lives in the story (`parameters.design`), read by the pipeline; `visual/figma/sets.ts` duplication goes away.
  - Output: HTML report (designers) + Storybook panel, both from one model (as today).
  - Kit target distribution: npm package (addon + vitest plugin + CLI) on a private registry; skills/rules shipped in package and copied on install.
  - Project seam: one `figma-qa.config.ts` (tokens source, icon resolver, backdrop, brand theme, file keys).
  - CI in v1: PRs touching `src/components/ui` → summary comment + HTML artifact.
  - Variable names: research alternatives first; fallback = match colors to tokens by resolved value.

## Decisions so far

- [Variable names without the Enterprise REST scope](issues/02-variable-names-without-rest.md): no non-Enterprise CI route for id→name; keep Plugin API (`use_figma`) for new ids only, run by agent in-session; CI reads committed `variables.json`, falls back to value match as warning. Optional: design fills `codeSyntax.WEB`.
- [Figma REST fetch: depth, geometry, batching, caching, limits](issues/03-figma-fetch-optimization.md): `/meta` `version` = cache key; unchanged → zero Tier-1 calls (keep raw `/nodes` JSON locally so `--refresh` rebuilds offline); changed → one full `/nodes` (no depth/geometry) + per-set subtree hash → `/images` only for changed sets. Token owner needs Dev/Full seat on kit file's plan.
- [Storybook 10 / 11-beta packaging mechanisms for the kit](issues/04-storybook-kit-packaging.md): one ESM package, peer `storybook ^10.6.0 || ^11.0.0-0`; exports `./preset` (viteFinal route), `./manager`, `./preview` (`definePreviewAddon`), `./vitest`, CLI `init` (own init — `storybook add` skips postinstall for 3rd-party), bundled `skills/`. Under `definePreview` preset previewAnnotations ignored. Risks: Node 22.12 / Vite 6.3 min, `storybook/internal/babel` gone in 11, no `setProjectAnnotations` in setup file on 11.

## Not yet specified

- Hosting of the designer-facing HTML report (Pages / Chromatic / S3) — waits on packaging + CI.
- GitHub Actions specifics: browser image in CI, caching `__refs__`, comment format.
- First-run wizard contents (token, Docker, MCP auth, `.env.local`).
- Kit versioning/upgrade path for consumer projects (how copied skills/rules get updated).
- Migrating this repo to consume the kit instead of in-tree `visual/`.
- Designer self-service (run without dev env).

## Out of scope

- Frameworks other than React + Vite (Next.js etc.); Storybook < 10. New adapter = new effort.
