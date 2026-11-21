# Figma REST fetch: depth, geometry, batching, caching, limits

Type: research
Status: resolved
Blocked by: —

## Question

Spec extraction calls (visual/figma/figma-api.ts): `/files/:key/meta`, one `/files/:key/nodes?ids=<sets>&version=` (no `depth`, no `geometry`), one `/images/:key?ids=<variants>&format=png&scale=2&use_absolute_bounds=true`, `/files/:key/component_sets`. From Figma's official REST docs: exact semantics of `depth`, `geometry=paths`, `plugin_data`, `branch_data` on `/nodes`; max ids/URL length per call; current rate-limit tiers (per plan/seat, per endpoint cost) and `Retry-After` behaviour; whether `/meta` `version`/`last_touched_at` or `/files?depth=1` `lastModified` is the right cache key; whether per-node change detection exists (versions endpoint, webhooks `FILE_UPDATE`/`LIBRARY_PUBLISH`); image export limits and caching of image URLs. Output: what fields the spec extractor actually needs vs what a full subtree returns, and the cheapest call pattern.

## Answer

- Current 3-call pattern is near-optimal. Keep `/nodes` with no `depth` and no `geometry`: the extractor walks full variant subtrees and reads only `absoluteBoundingBox`, paints, effects, auto-layout, text style and `boundVariables`. `geometry=paths` only adds `size`, `relativeTransform`, `fillGeometry` and `strokeGeometry`, which the extractor never reads.
- The cache key is `version` from `/meta` (Tier 3). It is documented as incremented on every modification, and `/meta` has no `lastModified`. Never use `/files?depth=1`, because it is Tier 1.
- Figma has no change detection per node. Webhook `FILE_UPDATE` carries only the file key. `LIBRARY_PUBLISH` carries component keys, and only on publish. `component_sets` lists published sets only. To detect changes per set, hash each set's `/nodes` subtree and re-render images only for sets whose hash changed.
- `--refresh` with an unchanged version could skip `/nodes` (Tier 1) by keeping the raw `/nodes` JSON locally (gitignored).
- Rate limits are counted per token user per plan of the file. The token needs a Dev/Full seat on that plan (Tier 1 is 10/15/20 per minute on Starter/Pro/Org). On a View/Collab seat it drops to up to 20 per month. Log `X-Figma-Rate-Limit-Type` on a 429.
- Image URLs expire after 30 days, and exports are capped at 32 MP. No maximum on ids or URL length is documented (205 ids is about 3.1 KB today), so chunk only as a fallback.
- Full write-up: [../research/03-figma-fetch-optimization.md](../research/03-figma-fetch-optimization.md)
