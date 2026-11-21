# Variable names without the Enterprise REST scope

Type: research
Status: resolved
Blocked by: —

## Question

Figma REST `/files/:key/variables/local` returns 403 (Enterprise-only scope). Today names come from a manual `use_figma` Plugin-API round trip → scratch file → `pnpm vrt figma --variables` → rerun (`visual/figma/variables.ts`, `__refs__/variables.json`). Which other primary-source routes give variable **names** for bound variable IDs found in node data, without Enterprise and without a human step? Candidates: `/variables/published` (library), node `boundVariables` + `/files/:key/styles`, Code Connect, Figma Dev Mode / MCP `get_variable_defs` callable non-interactively, design-team token export (Tokens Studio / W3C DTCG JSON in repo). For each: plan requirement, auth scope, automatable in CI (no MCP client), latency. Also: what's lost if we drop names and match by resolved value only.

## Answer

- No non-Enterprise route gives id→name in CI. `/variables/published` is also Enterprise + `file_variables:read`; our ids are local anyway.
- REST node JSON has `VariableAlias` ids only; `styles` map names styles, not variables.
- MCP `get_variable_defs` returns name→value (observed), no ids/collection/mode: can't map ids when values collide (`Icons/primary` = `Text/primary` = `#fefefe`).
- Plugin API (`figma.variables.getVariableByIdAsync`) via `use_figma` is the only any-plan id→name route: keep it, incremental, agent-run in session.
- CI: read committed `variables.json`; unnamed ids → value-match fallback labelled as guess (warn, not fail). Value-only loses semantic vs primitive layer, mode safety, wrong-token-right-value detection.
- Optional: design fills `codeSyntax.WEB`; DTCG export only useful if it embeds Figma ids in `$extensions`.
- Details + sources: [research/02-variable-names-without-rest.md](../research/02-variable-names-without-rest.md). Confidence high (REST/MCP), medium (native DTCG export).
