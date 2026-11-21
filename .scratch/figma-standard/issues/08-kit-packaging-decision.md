# Kit packaging and install into existing Storybook

Type: grilling
Status: resolved
Blocked by: 04

## Question

Given ticket 04's findings: package boundaries (one package vs addon + CLI split), install entry (`storybook add`, `npx <kit> init`, codemod over `storybook init`), behaviour on projects with no Storybook / Storybook 10 / 11 beta / custom config, how skills/rules are copied and kept updatable, idempotency (re-run safe), and what the kit refuses to touch.

## Answer

Grilled with the human, 2026-11-21, on the Storybook 10 / 11-beta packaging research.

- **Boundary**: one package (addon `preset`/`manager`/`preview`, `vitest` plugin, `figma-qa` CLI, `skills/`); heavy CLI deps lazy-loaded. Name/scope waits on Registry provisioning.
- **Install entry**: `pnpm dlx <kit> init` does everything: add the package, merge config, install skills + rules, write `figma-qa.config.ts`, then wizard prompts only for missing human items (token, Docker). `--yes` = no prompts (CI/agents). No `storybook add <kit>` path; `storybook add @storybook/addon-vitest` only when addon-vitest is missing.
- **Project states**: no Storybook → official `storybook init` for react-vite (latest 10; `--next` → 11 beta), then merge. SB 10.6+/11 → merge. SB < 10.6 → refuse, point at `storybook upgrade`. Not React + Vite → refuse, naming what was found.
- **Config merge**: standalone AST tool (magicast), never `storybook/internal/*`. `main.ts` `addons` += kit; CSF Next preview → `figmaQa()` in `definePreview({ addons })`, classic → nothing; Vitest config += kit project. Unsafe shape (spread/shared `addons`, odd Vitest config) → print the exact snippet, exit 2.
- **Skills**: delegate placement to `npx skills add <installed-kit>/skills --copy -y` (stable `add`, local path; handles `.agents/skills` canonical + `.claude/skills`, `skills-lock.json` hashes). Kit upgrade → `init` sees changed version/hash and re-runs it. Verify local-path `add` in the kit spike; fallback = copy into `.agents/skills/` + symlink into `.claude/skills/`.
- **Rules**: a marked block `<!-- figma-qa:start -->…<!-- figma-qa:end -->` in `AGENTS.md` (tiny, points at skills); also in `CLAUDE.md` when it exists without `@AGENTS.md`. `init` rewrites only between its markers.
- **Idempotency**: every step detects before acting; re-run on a set-up project changes nothing, exit 0. `--dry-run` prints the plan.
- **Never touches**: stories, components, tokens; manager theme / `addons.setConfig`; other Vitest projects; git (no commits/hooks); CI files; `.env.local` beyond a `FIGMA_TOKEN=` line via the wizard, only if gitignored.
- **Floors**: peer `storybook ^10.6.0 || ^11.0.0-0`, `vitest ^4 || ^5`, `react`; `engines` Node ≥ 22.12, Vite ≥ 6.3 (SB 11 floor for both). Kit CI: fixture matrix SB 10.6 + 11-next.

Glossary: added **QA kit** and **UI kit** (bare "kit" is ambiguous).
