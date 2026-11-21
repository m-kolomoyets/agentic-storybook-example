# 06: Project config seam

**What to build:** A project can optionally add `figma-qa.config.ts` with `defineConfig` to adjust token prefix, token naming, icons, refs dir and diff tolerance; with no file every default applies. The same file is read by the CLI and the preview.

**Blocked by:** 03 Offline report tracer

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Keys: `tokens.prefix` (default `--color-`), `tokenName(variable)` (default kebab of full path + prefix), `icons { glob, name }` (default name = kebab of last segment), `refsDir` (default `figma-qa/__refs__`), `maxDiffRatio` (story parameter overrides)
- [ ] Config reaches preview through a kit virtual module; CLI loads it via Vite `loadConfigFromFile`
- [ ] Unknown keys or wrong types → error, exit 2 (from both `report` and `doctor`)
- [ ] Tokens read at runtime from preview CSSOM by prefix with `var()` aliases resolved; no token file list
- [ ] Icons glob served as a virtual module, SVGs loaded `?raw`; no icons found → cells render without glyphs + doctor warning
- [ ] Fixture with a custom config proves each key changes behaviour; fixture without config uses defaults
