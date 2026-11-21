# 04: Figma sync with REST stub

**What to build:** Refs are fetched from Figma lazily when a Figma story needs them. Tests run against a local stub of the Figma REST API serving recorded responses; the CLI's Figma base URL is overridable by env var. Unchanged Figma files cost no heavy calls; changed ones refetch once and re-render images only for sets that changed.

**Blocked by:** 03 Offline report tracer

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Browser command `figmaEnsureSets(urls)` called per Figma story before checks; Node coalesces concurrent calls per file key (≈ one `/nodes` per file per run)
- [ ] Cache key = `/meta` `version`; unchanged → zero `/nodes`/`/images` calls
- [ ] Changed → one full `/nodes` (no `depth`, no `geometry`), per-set subtree hash, `/images` (png, scale 2, absolute bounds) only for sets whose hash changed
- [ ] Per-set manifest records subtree hash + file version; raw `/nodes` JSON kept in gitignored `node_modules/.cache/figma-qa/`; `--refresh` with unchanged version rebuilds from it offline
- [ ] No token + set cached → runs offline; no token + set not cached → exit 2 "set X not cached; run with token"
- [ ] 401/403 → exit 2 with token-rejected message; 429 → logged with `X-Figma-Rate-Limit-Type`
- [ ] Figma version newer than synced → warning only, exit unaffected
- [ ] File key taken from each URL; no file-key config
