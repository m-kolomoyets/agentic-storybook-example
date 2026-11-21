# 13: First-run wizard

**What to build:** `init` ends with a wizard built on `doctor` checks that prompts only for missing human items, then prints the remaining checklist including the CI caller snippet.

**Blocked by:** 04 Figma sync with REST stub; 12 figma-qa init

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Doctor checks in order: registry → Figma token → file access → Docker / image → variables-naming info; each ok / missing / blocked + human fix
- [ ] `FIGMA_TOKEN` prompt; validated with `GET /v1/me` and, when a Figma story exists, `/meta` on its file; Dev/Full seat requirement printed
- [ ] Token written to `.env.local` only when `git check-ignore` confirms ignored; otherwise refuse and print the line
- [ ] Docker detected only; present → Y/n pull pinned image; absent → host-fallback info
- [ ] Figma MCP: info line only; registry auth never prompted
- [ ] `--yes` / non-TTY: no prompts, no secrets written, no pull; checklist; exit 0
- [ ] Complete setup → all green, no prompts, no changes
- [ ] Install docs: `gh auth refresh -s read:packages` + user `~/.npmrc` token line; classic PAT fallback
