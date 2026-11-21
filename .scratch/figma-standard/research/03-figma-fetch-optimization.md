# 03 — Figma REST fetch: depth, geometry, batching, caching, limits

Ticket: [../issues/03-figma-fetch-optimization.md](../issues/03-figma-fetch-optimization.md). Researched 2026-11-21 against developers.figma.com and Figma's OpenAPI spec (`@figma/rest-api-spec` 0.47.0). No live Figma calls were made.

## TL;DR

- The current pattern (`/meta` → one `/nodes?ids=<sets>&version=` → one `/images?ids=<variants>&version=`) is already close to the cheapest one. **Don't add `depth`.** The extractor walks whole variant subtrees down to vector leaves. **Don't add `geometry=paths`.** It only adds fields the extractor never reads.
- Rate limits count **per token user, per plan of the file**. The token owner must hold a **Dev or Full seat on the plan that owns the kit file**. With a View or Collab seat, Tier 1 (`/nodes`, `/images`) drops to "up to 20/month", and Figma's own example gives 6/month. This matters more than any other change.
- Cache key: the file `version` from `/meta` (Tier 3, cheap). It is file-wide, and no REST endpoint or webhook detects changes per node. Per-set detection has to be computed: hash each set's `/nodes` subtree.
- Two real savings are still available. (1) On `--refresh` with an unchanged `version`, skip `/nodes` (Tier 1) by keeping the raw `/nodes` JSON locally and rebuilding specs offline. (2) Re-render images only for sets whose subtree hash changed, not for every set whenever the file version moves.

## What the code calls today

Source: `visual/figma/figma-api.ts` (`figmaGet`, `syncFigmaSets`, `syncFigmaCatalog`) and `visual/figma/doctor.ts:73`.

| Call | Tier | When |
|---|---|---|
| `GET /v1/files/:key/meta` | 3 | Once per file, on every sync that has a stale set, and in `--doctor` |
| `GET /v1/files/:key/nodes?ids=<12 sets>&version=V` | 1 | Once per file when any set is stale, and always with `--refresh` |
| `GET /v1/images/:key?ids=<205 variants>&format=png&scale=2&use_absolute_bounds=true&version=V` | 1 | When a set lacks PNGs or its manifest `version` ≠ V |
| `GET /v1/files/:key/component_sets` | 3 | `catalog.json`, missing or with `--refresh` |
| CDN download of image URLs | none | 8 in parallel |

Current scale: 12 sets and 205 variants in one file (`GPPlxspxcbP4kc13YwNJTH`). All manifests are pinned to `version` `2423344990798825378`. The joined variant ids are 2,263 characters, about 3.1 KB once URL-encoded (`,`→`%2C`, `:`→`%3A`).

`spec.ts` is the browser-side comparator. It reads only the manifest (`FigmaSpec`) and never sees raw nodes, so it puts no requirements on the fetch.

## Fields the spec extractor reads (`figma-api.ts` `toSpec` and helpers)

The `FigmaNode` type (`figma-api.ts:33-76`) lists every field the extractor reads.

- Identity and tree: `id`, `name`, `type`, `visible`, `children`, `componentId`, and `componentPropertyDefinitions` (set: `type`, `defaultValue`, `variantOptions`).
- Geometry: `absoluteBoundingBox` only (root size, text, icon and child boxes, `sameBox`).
- Paint: `fills[]` / `strokes[]` (`type`, `visible`, `opacity`, `color`, `boundVariables.color`), `strokeWeight`, `individualStrokeWeights`, `strokeAlign`, `strokeDashes`, `opacity`, `blendMode`, `cornerRadius`, `rectangleCornerRadii`.
- Effects: `effects[]` (`type`, `visible`, `color`, `offset`, `radius`, `spread`).
- Auto layout: `layoutMode`, `layoutPositioning`, `layoutWrap`, `layoutSizingHorizontal`, `layoutSizingVertical`, `primaryAxisAlignItems`, `counterAxisAlignItems`.
- Text: `characters`, `textTruncation`, and from `style`: `fontFamily`, `fontSize`, `fontWeight`, `lineHeightPx`, `letterSpacing`, `textCase`, `textDecoration`, `textAlignHorizontal`, `textAutoResize`, `textTruncation`.
- Variables: `boundVariables` keys `fills`, `strokes`, `rectangleCornerRadii`, `topLeftRadius`, `itemSpacing`, `paddingTop/Right/Bottom/Left`, `fontSize`, `lineHeight`, `letterSpacing`, `fontFamily`, `fontStyle`, `fontWeight`.
- Response-level: `version`, `lastModified`, `nodes[id].components[cid].{name, componentSetId}`, `nodes[id].componentSets[sid].name`.

Depth needed: everything. The fields are read at these levels.

- The set node supplies `componentPropertyDefinitions` and its `COMPONENT` children.
- Each variant subtree is walked fully (`toSpec.walk`).
- Icon instances are recursed down to leaf shapes (`glyphColor`), and their subtree is `JSON.stringify`'d to look for `"TEXT"`.

A full `/nodes` subtree also returns many fields the extractor never reads: `exportSettings`, `constraints`, `interactions`, `componentProperties` / `componentPropertyReferences` on instances, `styles`, `effects` on leaves, `absoluteRenderBounds`, the new stroke fields (`complexStrokeProperties`, `variableWidthPoints`, added 2026-01-26 per the [changelog](https://developers.figma.com/docs/rest-api/changelog)), and others. The API has no field selector (none is documented on [file endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/)), so trimming can only happen after the response arrives.

## Parameter semantics on `/nodes` (and `/files`)

Source: [File endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/).

- **`ids`** is required: "A comma separated list of node IDs to retrieve and convert." **No maximum count or URL length is documented.** The nodes map "may contain values that are null", for example when an id doesn't exist. The current code already throws on a non-`COMPONENT_SET`.
- **`version`** is "A specific version ID to get. Omitting this will get the current version of the file." Pinning `/nodes` and `/images` to the `/meta` version, as the code does, gives a consistent snapshot.
- **`depth`**: on `/nodes` it counts from the requested nodes. Depth 1 "will return only the children directly underneath the desired nodes". On `/files` it counts from the document root (1 = pages). Omitted means the full subtree. The extractor needs the full subtree, so a depth cap would silently drop text and glyph leaves. Not useful here.
- **`geometry=paths`** means "export vector data". With it, the response also carries `size`, `relativeTransform`, `fillGeometry`, `strokeGeometry` and fill override regions, each documented as "Only present if `geometry=paths` is passed" or "...used" ([node types](https://developers.figma.com/docs/rest-api/file-node-types/)). The extractor reads none of these. Keep it off, because it inflates the payload.
- **`plugin_data`**: comma-separated plugin ids or `shared`, returned in `pluginData` / `sharedPluginData`. Not needed.
- **`branch_data`** (default `false`) returns the main file key and branch metadata. It is documented on `GET /files`, not `/nodes`. Not needed unless sets live on branches (use the branch key as `:key`).

## `/images` semantics and limits

Source: [File endpoints → GET image](https://developers.figma.com/docs/rest-api/file-endpoints/).

- Several `ids` can be rendered in one request. **No documented maximum**, and no render timeout is documented.
- `scale` must be between 0.01 and 4. `format` is `jpg`, `png`, `svg` or `pdf`.
- `use_absolute_bounds` (default `false`) uses the node's full dimensions, which is right for element-screenshot parity. `contents_only` defaults to `true`, and `false` "may increase processing time".
- Size: "Images up to 32 megapixels can be exported". Anything larger "will be scaled down". At scale 2, a variant would need to be about 4000×2000 CSS px to hit this, so it's irrelevant for components.
- URL lifetime: "The image assets will expire after 30 days." Download immediately, as the code does. The committed PNGs are the real cache, so never store the URLs.
- Per-id `null` "indicates that rendering of that specific node has failed". A 500 means "Unexpected rendering error". The code throws on `null`. A whole-batch 500 on a large batch is plausible but undocumented, so chunking on failure is a reasonable fallback, not a requirement.

## Rate limits (in effect since 2025-11-17)

Source: [Rate limits](https://developers.figma.com/docs/rest-api/rate-limits/). The changelog entry of 2025-09-23 announced them.

| Tier | Endpoints (relevant) | View/Collab seat | Dev/Full: Starter / Pro / Org |
|---|---|---|---|
| 1 | GET file, **GET file nodes**, **GET image** | **up to 20 / month** | 10 / 15 / 20 per min |
| 2 | Version history, webhooks, variables (GET) | up to 5 / min | 25 / 50 / 100 per min |
| 3 | **GET file metadata**, **components and styles** (incl. `component_sets`) | up to 10 / min | 50 / 100 / 150 per min |

The Enterprise column for Dev/Full did not render in the fetched page, so it is unverified. Tiers come from [component endpoints](https://developers.figma.com/docs/rest-api/component-endpoints/), "Tier 3", and the version history page, "Tier 2".

- Accounting: "Figma uses a leaky bucket algorithm."
  - Personal access tokens are tracked per user per plan, and the limit follows the plan of the requested file.
  - OAuth apps are tracked per user, per plan, per app.
  - Plan access tokens are tracked per token per plan. They became GA for Org and Enterprise plans on 2026-07-23 ([changelog](https://developers.figma.com/docs/rest-api/changelog)).
- Figma's own example: with a PAT on a Starter-plan file, requests "are limited to up to 6 per month even if you have a Full seat in a different plan". This contradicts the 10/min table cell. The likely reason is that the user has no seat on that plan, but the page doesn't say. "The actual limit may be lower" depending on demand.
- On a 429:
  - `Retry-After`: "In seconds, how long before you should retry sending the request."
  - `X-Figma-Plan-Tier`: `enterprise`, `org`, `pro`, `starter` or `student`.
  - `X-Figma-Rate-Limit-Type`: `low` for View/Collab, `high` for Full/Dev.
  - `X-Figma-Upgrade-Link`.
  - The code retries once when the wait is ≤60 s and otherwise reports. That is consistent with the docs. Adding `X-Figma-Rate-Limit-Type` to the error text would make the seat problem self-diagnosing, and `doctor.ts` could surface it too.
- No per-request cost metric is published. Tiers reflect "infrastructure and cost". The documented advice is to batch and to cache: "Batch requests whenever possible", "Cache results".

## Cache key

- **`version`** is defined in the OpenAPI spec ([`@figma/rest-api-spec`](https://unpkg.com/@figma/rest-api-spec/openapi/openapi.yaml), `GetFileResponse` / `GetFileNodesResponse` / `GetFileMetaResponse`) as: "The version number of the file. This number is incremented when a file is modified and can be used to check if the file has changed between requests." It is returned by `/meta`, `/nodes` and `/files`, and it is the documented change key.
- **`/meta`** (Tier 3, scope `file_metadata:read`, added 2025-04-29) returns `name`, `folder_name`, `last_touched_at`, `creator`, `last_touched_by`, `thumbnail_url`, `editorType`, `version`, `role`, `link_access` and `url`. It has **no `lastModified`**. `last_touched_at` is "The UTC ISO 8601 time at which the file content was last modified" (spec).
- `GET /files?depth=1` would return `lastModified` and `version` too, but it is **Tier 1**. Never use it as the check. `/meta` is the cheap probe.
- Recommendation: key on `version` (exact, documented) and keep `last_touched_at`/`lastModified` only for display.

## Per-node or per-set change detection

The REST API and webhooks offer no per-node change detection.

- **Versions** (`GET /v1/files/:key/versions`) are Tier 2 with scope `file_versions:read` ([version history](https://developers.figma.com/docs/rest-api/version-history-endpoints/)). Each entry has `id`, `created_at`, `label` (nullable), `description`, `user` and `thumbnail_url` (spec `Version`). The nullable `label` suggests autosaves are listed, but the docs don't say so. There is no node-level information.
- **Webhooks v2** ([events](https://developers.figma.com/docs/rest-api/webhooks-events/), [overview](https://developers.figma.com/docs/rest-api/webhooks/)) can attach to team, folder (`project`) or file contexts, with 3 per file.
  - `FILE_UPDATE` "Triggers within 30 minutes of editing inactivity in a file". Its payload carries file key and name only.
  - `FILE_VERSION_UPDATE` fires on named versions.
  - `LIBRARY_PUBLISH` lists created, modified and deleted components, styles and variables (key and name, no node id). Component sets are not mentioned, and one publish can arrive as several events.
  - `DEV_MODE_STATUS_UPDATE` carries one `node_id`.
  - All of these need a public HTTPS receiver, so they don't fit a local `pnpm vrt figma` loop. `LIBRARY_PUBLISH` would only help if CI listened for it.
- **`component_sets` `updated_at`** exists on the `ComponentSet` type ([component types](https://developers.figma.com/docs/rest-api/component-types/)). The endpoint returns only **published** sets: "Get a list of published component sets within a file library" ([component endpoints](https://developers.figma.com/docs/rest-api/component-endpoints/)). So `updated_at` tracks the published library, not live edits. That makes it a cheap (Tier 3) signal only if the kit is always published before it's compared.
- **Practical per-set detection**: hash each set's `/nodes` subtree JSON (after dropping volatile fields if any appear). The REST response contains resolved paint values and instance children, so edits to main components and variable values show up in the subtree. Skip the image re-render for sets whose hash matches the manifest. This costs nothing extra because `/nodes` is fetched anyway.

## Recommended call pattern

1. **Probe**: `GET /files/:key/meta` (Tier 3). Compare `file.version` to the manifest `source.version`.
2. **Equal**: make no Tier 1 calls. On `--refresh` with only extractor code changed, rebuild specs from a locally kept raw `/nodes` response for that version (gitignored, keyed by `version`) instead of re-fetching. Today `--refresh` always spends a Tier 1 `/nodes` call.
3. **Different**: make one `GET /files/:key/nodes?ids=<all sets>&version=V` with no `depth`, no `geometry`, no `plugin_data`. Hash each set's subtree.
4. **Images**: make one `GET /images/:key?ids=<variants of sets whose hash changed or whose PNGs are missing>&format=png&scale=2&use_absolute_bounds=true&version=V`. Download from the CDN at once, because the URLs expire after 30 days.
   - Chunk only defensively, since no limit is documented: split if the URL exceeds about 6 KB (an assumption, since common server limits are about 8 KB; today it is about 3.1 KB), or on a 500 or 400.
5. **Catalog**: refresh `GET /files/:key/component_sets` (Tier 3) only when the version changed. Its `updated_at` can serve as a publish-level hint.
6. **Seat**: document that `FIGMA_TOKEN` must belong to a Dev/Full seat on the file's plan. Print `X-Figma-Rate-Limit-Type`, `X-Figma-Plan-Tier` and `Retry-After` on a 429, and check them in `--doctor`.

Worst case per real change: 1× Tier 3 + 2× Tier 1, the same as today's best case, but `--refresh` without a version change drops from 2 calls to 1× Tier 3.

## Confidence

- **High** on parameter semantics, tiers and seat rules, image expiry, `version` as the change key, and webhook payloads. These are quoted from the docs and the spec.
- **Medium** on autosaves appearing in `/versions` and on `component_sets.updated_at` meaning publish time. Both are inferred and not stated.
- **Unknown**: the max `ids` count or URL length on `/nodes` and `/images`, the Enterprise Dev/Full numbers, and the render timeout for large image batches. None of these are documented.
