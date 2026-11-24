# 06: Project config seam

**What to build:** A project can optionally add `figma-qa.config.ts` with `defineConfig` to adjust token prefix, token naming, icons, refs dir and diff tolerance; with no file every default applies. The same file is read by the CLI and the preview.

**Blocked by:** 03 Offline report tracer

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] Keys: `tokens.prefix` (default `--color-`), `tokenName(variable)` (default kebab of full path + prefix), `icons { glob, name }` (default name = kebab of last segment), `refsDir` (default `figma-qa/__refs__`), `maxDiffRatio` (story parameter overrides)
- [x] Config reaches preview through a kit virtual module; CLI loads it via Vite `loadConfigFromFile`
- [x] Unknown keys or wrong types → error, exit 2 (from both `report` and `doctor`)
- [x] Tokens read at runtime from preview CSSOM by prefix with `var()` aliases resolved; no token file list
- [x] Icons glob served as a virtual module, SVGs loaded `?raw`; no icons found → cells render without glyphs + doctor warning
- [x] Fixture with a custom config proves each key changes behaviour; fixture without config uses defaults

## Answer

Done 2026-11-24 in `Phenomenon-Studio/storybook-figma-qa` `main`, commits `4a41569` (feature), `1e7b599` (review fixes) and `87bbeb9` (icons glob default). CI green on all four jobs (sb10 and sb11 × Node 22.12.0 and LTS): [run 45432849658](https://github.com/Phenomenon-Studio/storybook-figma-qa/actions/runs/45432849658). Typecheck is green on the kit and both fixtures. `pnpm test` passes 66/66: 20 unit tests for config resolution plus 16 new CLI tests in `fixtures/sb10` and `fixtures/sb11`. Storybook build and panel smoke pass on both, including with an invalid config present.

Decisions later tickets need:

- **Public surface.** `./config` exports only `defineConfig`, `iconName` and the `FigmaQaConfig` / `FigmaVariable` types. Resolution and validation live in the internal `figma/config.ts`. `./preview` gains `FigmaIcon({ figma })`, which renders the project SVG a Figma glyph names, inline so it inherits `currentColor`.
- **Defaults.** The icons glob defaults to `src/icons/*.svg` (user decision; configurable via `icons.glob`). The default `tokenName` is unchanged (kebab of the full path after the prefix). `tokenName` may return `null` to fall back to value matching (that's ticket 07's path).
- **Validation.** Unknown keys at any depth and wrong types throw `FigmaQaConfigError`. `report` and `doctor` exit 2 before Vitest starts. Beyond the spec: `tokens.prefix` must start with `--`, `maxDiffRatio` must be within 0..1, and `icons.glob` must be relative and inside the project, because Vite serves it root-relative while doctor globs from the root.
- **Loading.**
  - Node: Vite `loadConfigFromFile` on `figma-qa.config.ts` only, memoized per root per process, so the CLI, browser commands and preset share one load.
  - Preview: the preset's `viteFinal` adds the plugin, and addon-vitest applies `viteFinal` too. `virtual:figma-qa/config` re-exports the file unvalidated, so a broken config fails only the Figma stories that read it (`figma/project.ts` resolves lazily), never the whole preview. `virtual:figma-qa/icons` is `import.meta.glob(..., { query: '?raw' })`, and it serves `{}` on a broken config.
  - The dev server watches the config file, invalidates both modules and does a full reload.
- **Vite gotcha.** The plugin puts `@phenomenon-studio/storybook-figma-qa/config` in `optimizeDeps.exclude`. Without it, the first run after adding a config discovers that import mid-run, re-optimizes and fails every story file. Kit AGENTS.md has the gotcha.
- **Tokens.** Every custom property is read so that `var()` aliases resolve across prefixes, then only names with the prefix count as tokens.
- **Doctor.** It now prints `config:` and `icons:` lines, and warns when the glob finds no icons (exit stays 0). The new dependency `tinyglobby@0.2.17` is the version Vite already ships, so consumers download nothing extra.
- **Fixtures.**
  - New `Glyph` set (20:0) with one icon instance per variant.
  - `Swatch` Neutral's fill is bound to `Tone/Neutral` (`variables.json` committed in the refs dir).
  - `--swatch-*` alias tokens.
  - `src/glyphs/glyph-*.svg`, which sits outside the default glob.
  - The fixtures commit no config. `test/config-cli.test.ts` writes one that changes every key, moves the refs to `design/refs`, and restores both afterwards. An interrupted run can leave a fixture mutated; `git checkout fixtures` fixes it.
  - Without a config, `Glyph.figma` exits 1 by design: its cells render no glyphs.
- **Not done.** No `figma-qa migrate` step, because the package is still unreleased. Icon identity is only exercised on the passing path; no fixture renders the wrong icon.
