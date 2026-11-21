# First-run setup wizard contents

Type: grilling
Status: resolved
Blocked by: —

## Question

`figma-qa init` ends with a wizard that prompts only for missing human items (Kit packaging decision). Define its contents: which items it covers (registry auth `.npmrc` + `read:packages` PAT, `FIGMA_TOKEN` and its seat requirement, Docker, Figma MCP auth for `use_figma` variable naming), order, how each is detected as already done, where each answer is written (`.env.local` only if gitignored, `.npmrc`), what `--yes` does per item, and how the pre-`dlx init` registry-auth chicken-and-egg is solved (install docs vs bootstrap one-liner). Inputs: Choose and provision the private registry, One-command report flow, Figma REST fetch (seat/rate limits).

## Answer

Grilled with the human, 2026-11-21.

- **Wizard = doctor + prompts**: `init` reuses `figma-qa doctor` checks (each → ok / missing / blocked + optional human fix). Prompts only for missing items with a human fix; re-run on complete setup = doctor all-green, no changes.
- **Order**: registry → Figma token → file access → Docker / image → variables-naming info.
- **Registry auth**: never prompted (`dlx init` already authenticated). Bootstrap lives in install docs: `gh auth refresh -s read:packages`, then user `~/.npmrc` `//npm.pkg.github.com/:_authToken=<gh auth token>`; fallback = classic PAT with `read:packages`. `init` writes project `.npmrc` with only `@phenomenon-studio:registry=https://npm.pkg.github.com` (committed); token stays user-level; CI auth via `setup-node` + `NODE_AUTH_TOKEN`. No `${NODE_AUTH_TOKEN}` line in project `.npmrc` (empty when unset → breaks local installs).
- **`FIGMA_TOKEN`**: prompted. Done = env var set (shell or `.env.local`) and `GET /v1/me` 200; if a Figma story link exists, also `/meta` on its file for access. Written to `.env.local` only when `git check-ignore` confirms ignored; otherwise refuse and print the line. Dev/Full seat not detectable up front: one-line requirement printed; later 429 reported with `X-Figma-Rate-Limit-Type`.
- **Docker**: detect only (`docker info`), never installed. Present → Y/n to pull the pinned browser image. Absent → info: host-browser fallback, pixels not comparable to CI.
- **Figma MCP (variable naming)**: info line only; auth is agent-specific, naming stays a skill flow via `use_figma`.
- **`--yes` / non-TTY**: no prompts, never writes secrets, never pulls image; prints remaining checklist, exit 0 (missing token is legit for cached/offline runs; `report` exits 2 later if it truly needs it).
