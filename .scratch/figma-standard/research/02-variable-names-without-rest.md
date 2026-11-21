# Variable names without the Enterprise REST scope

Ticket: [`issues/02-variable-names-without-rest.md`](../issues/02-variable-names-without-rest.md). Researched 2026-11-21.

## Question

Node JSON from REST (`GET /v1/files/:key/nodes`) carries `boundVariables` → `VariableAlias { type, id }` only. Which routes turn those ids into names on a non-Enterprise plan, with no human step, ideally in CI?

## Facts (primary sources)

1. **Variables REST is Enterprise-only, local and published alike.** "To use this API, you must have a Full seat in an Enterprise org; guests cannot use the API." Scope `file_variables:read`. ([Variables overview](https://developers.figma.com/docs/rest-api/variables/))
   Both `GET /v1/files/:key/variables/local` and `/variables/published` need `file_variables:read`, both say "available to full members of Enterprise orgs", Tier 2. `/published` does return `name`, `key`, `subscribed_id`, `resolvedType`, but no modes/values. ([Variables endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/))
   → `/variables/published` is **not** a workaround. Also moot here: our ids (`8019:325`, no `/` library suffix) are local variables of `GPPlxspxcbP4kc13YwNJTH`, not published-library subscriptions (observed in `visual/figma/__refs__/variables.json`).

2. **Node JSON has ids only.** `VariableAlias`: `type: VARIABLE_ALIAS`, `id` = "The id of the variable that this alias points to." ([Variables types](https://developers.figma.com/docs/rest-api/variables-types/)). File/node endpoints (`file_content:read`, Tier 1, no plan restriction) document `styles` (style id → style metadata) and `components`, nothing for variables. ([File endpoints](https://developers.figma.com/docs/rest-api/file-endpoints/))
   → `styles` names **styles** (text/effect/paint styles), not variables. Helps for e.g. `Body/Medium (Semibold)` / `Shadows for Buttons`, not for `Surface/control`.

3. **Plugin API can read names on any plan.** `figma.variables.getVariableByIdAsync`: "Finds a variable by ID…"; `getLocalVariablesAsync`: "Returns all local variables in the current file". No plan restriction stated. ([figma.variables](https://developers.figma.com/docs/plugins/api/figma-variables/)). Plugins run inside the editor; docs describe no headless runner. That's today's route (`use_figma` executes plugin code remotely via MCP).

4. **MCP `get_variable_defs` returns name → value, no ids.** Docs: "Returns the variables and styles used in your selection, such as colors, spacing, and typography." ([Tools and prompts](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/)). Observed call on node `8038:2005` (2026-11-21) returned a flat map like `{"Icons/primary":"#fefefe","Text/primary":"#fefefe","Spacings/6":"6","Spacings/spacing-300":"6", "Body/Medium (Semibold)":"Font(...)", ...}`: names + resolved values, styles mixed in, **no variable ids, no collection, no mode**. Two names sharing a value (`Icons/primary`/`Text/primary`) can't be mapped back to an id.

5. **MCP server access/limits.** Starter or View/Collab: 20 calls/month; Full/Dev seat on Professional/Org: 200/day (+ per-minute); Enterprise: up to 600/day. Users sign in per person; file access = the account's own. No PAT/headless client mode documented. ([Rate limits & access](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/)) → usable from an agent session (as now), not documented for CI.

6. **Code Connect** maps Figma *components* to code (`add_code_connect_map`, `.figma.ts`); no docs describe it resolving variable ids. Not a route. (Figma MCP tool descriptions; [Code Connect docs](https://developers.figma.com/docs/code-connect/))

7. **Variable `codeSyntax`** ("platform-specific names", keys `WEB`/`ANDROID`/`iOS`) exists on the Variable type, but only reachable via the Enterprise endpoints or Plugin API. ([Variables types](https://developers.figma.com/docs/rest-api/variables-types/)) Worth asking design to set `WEB` = kit token (`--color-surface-control`); then the plugin export could read it instead of `kitColorToken()` guessing.

8. **Token file in repo (DTCG / Tokens Studio).** DTCG Format Module 2025.10 is a final CG report; tokens are JSON with `$value`/`$type`, and `$extensions` for vendor data. ([DTCG format 2025.10](https://www.w3.org/community/reports/design-tokens/CG-FINAL-format-20251028/)). A committed export gives names+values in CI with zero API, **but** only maps to node ids if the exporter writes Figma variable ids into `$extensions`; the spec doesn't require it. Figma's native variable import/export: no official help-center page found; a [forum thread](https://forum.figma.com/ask-the-community-7/native-variable-export-feature-47831) says it was rolling out gradually (secondary, unverified). Either way it's a manual export by a designer.

## Route comparison

| Route | Plan | Auth / scope | CI, no MCP | Latency | Gives id→name |
| --- | --- | --- | --- | --- | --- |
| REST `/variables/local` | Enterprise | `file_variables:read` | yes | 1 Tier-2 call | yes |
| REST `/variables/published` | Enterprise | `file_variables:read` | yes | 1 Tier-2 call | yes, published only (ours are local) |
| REST node `boundVariables` + `styles` | any | `file_content:read` | yes | already fetched | no (ids only; styles ≠ variables) |
| Plugin API via `use_figma` (current) | any (MCP quota) | MCP sign-in | no | 1 MCP call per batch of new ids | **yes** |
| MCP `get_variable_defs` | any (MCP quota) | MCP sign-in | no | 1 call/node | no ids; name→value only |
| Code Connect | n/a | — | — | — | no (maps components, not variables) |
| DTCG / Tokens Studio file in repo | any | none | yes | 0 | only if export embeds ids in `$extensions` |

## What dropping names (value-only matching) loses

- **Ambiguity:** equal values map to many tokens. Observed: `Icons/primary` = `Text/primary` = `Border/focused` = `Colors/white-alfa/100%` = `#fefefe`; `Spacings/6` = `Spacings/spacing-300` = 6. Value match picks one arbitrarily.
- **Semantic layer:** can't tell semantic (`Button/secondary-hover`) from primitive (`Colors/white-alfa/…`) binding, nor flag "hardcoded hex that happens to equal a token".
- **Right-value-wrong-token drift:** code using `--color-text-primary` where Figma binds `Icons/primary` passes today; once theme/mode values diverge it breaks silently.
- **Modes:** resolved value is one mode; names survive theme changes, values don't.
- Kept: visual-diff correctness (pixels/values still compared) and unbound properties (no change).

## Recommendation

No non-Enterprise route gives id→name in CI. Keep `variables.json` (Plugin API via `use_figma`) as the committed source of truth; it's incremental (only new ids) and ids are stable, so it's a rare step, which the agent can run itself in-session (no human copy-paste needed beyond the agent's own MCP call). In CI: never call Figma for names; read the committed catalogue, and for unnamed ids fall back to value-match **labelled as a guess** (warning, not failure). Optional upgrades: (a) ask design to fill variable `codeSyntax.WEB`, export it in the same script; (b) if the org ever gets Enterprise, swap the script for `/variables/local` behind the same `FigmaVariableCatalog` shape. Don't adopt `get_variable_defs` for this (no ids).

Confidence: high on REST/plan facts and `get_variable_defs` shape (doc + observed); medium on Figma native DTCG export (no official doc found).
