# 04: Figma sync with REST stub

**What to build:** Refs are fetched from Figma lazily when a Figma story needs them. Tests run against a local stub of the Figma REST API serving recorded responses; the CLI's Figma base URL is overridable by env var. Unchanged Figma files cost no heavy calls; changed ones refetch once and re-render images only for sets that changed.

**Blocked by:** 03 Offline report tracer

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] Browser command `figmaEnsureSets(urls)` called per Figma story before checks; Node coalesces concurrent calls per file key (≈ one `/nodes` per file per run)
- [x] Cache key = `/meta` `version`; unchanged → zero `/nodes`/`/images` calls
- [x] Changed → one full `/nodes` (no `depth`, no `geometry`), per-set subtree hash, `/images` (png, scale 2, absolute bounds) only for sets whose hash changed
- [x] Per-set manifest records subtree hash + file version; raw `/nodes` JSON kept in gitignored `node_modules/.cache/figma-qa/`; `--refresh` with unchanged version rebuilds from it offline
- [x] No token + set cached → runs offline; no token + set not cached → exit 2 "set X not cached; run with token"
- [x] 401/403 → exit 2 with token-rejected message; 429 → logged with `X-Figma-Rate-Limit-Type`
- [x] Figma version newer than synced → warning only, exit unaffected
- [x] File key taken from each URL; no file-key config

## Answer

Done 2026-11-24 in `Phenomenon-Studio/storybook-figma-qa` branch `ci/storybook-tests`, commit `5845f12` (not pushed yet, so no CI run). Typecheck is green on the kit and both fixtures. `pnpm test` passes 30/30, including 18 new sync tests that run the real CLI against a REST stub in `fixtures/sb10` and `fixtures/sb11`.

Decisions later tickets need:

- **Env vars.** `FIGMA_API_URL` is the REST base URL, default `https://api.figma.com`, with `/v1` appended. `FIGMA_TOKEN` is read only from the process env. Loading `.env.local` belongs to ticket 13. `report --refresh` passes itself to the in-process browser commands through `FIGMA_QA_REFRESH=1`.
- **`--refresh` needs a token.** Without one it exits 2 before running, because it must ask `/meta` for the version. "Offline" means no `/nodes` or `/images` calls, not no token. The spec line is updated to say so.
- **The version rule.**
  - Without `--refresh`, cached sets are always served from the committed refs.
  - With a token, one `/meta` per file per run compares the version. A newer version gives a warning; any `/meta` failure other than 401/403 gives a warning too ("using cached refs"), and the exit code is unchanged.
  - Uncached sets are fetched at the current version, so one file can end up with refs from mixed versions, with a warning on the older ones.
  - With `--refresh` at an unchanged version and no raw cache (for example a fresh CI checkout), the committed refs are kept and no heavy call is made.
- **Manifest format.** `source.hash` is added: sha256 of the set's raw `/nodes` entry, first 16 hex characters. A manifest without it re-renders its images on the next refresh. There is no `migrate` step because the package is still unreleased (`0.0.0`).
- **Raw cache.** `node_modules/.cache/figma-qa/nodes/<slug>.json` holds `{ version, lastModified, entry }`.
- **Coalescing.** One `FigmaSync` per Vitest instance. Each set is synced at most once per run, and failures are remembered, so the loader call and the `afterEach` call share one fetch. Sets of one file are batched over a 100 ms window.
- **Warnings.** These are new in the results model: `FigmaStoryResult.warnings` and the `--json` summary's `warnings`, deduplicated. Ticket 05 can render the "Figma changed" warning from there.
- **429 handling.** A 429 is logged to stderr and put in the error with `X-Figma-Rate-Limit-Type`. One bounded retry happens when `retry-after` ≤ 60 s, carried over from the in-tree pipeline.
- **Fixture recordings.** These now live in `packages/storybook-figma-qa/test/figma-api/FIXTUREKIT/` (`nodes.json` plus the variant PNGs). `pnpm build && node scripts/fixture-refs.mjs` writes them and builds the fixture refs with the kit's own extraction. A test checks that a sync from the stub reproduces the committed refs byte for byte.
- **Not done.**
  - Chunking `/images` ids as a fallback: all ids go in one call.
  - A test with two sets where only one hash changed: the fixture has one set, so only the per-set logic covers it.
  - Kit vitest runs `fileParallelism: false`, because test files share the fixtures.
  - `nightly.yml` runs `--refresh` against the fixture's synthetic file key `FIXTUREKIT`, which does not exist on live Figma, so it will fail until a real file is wired in.
