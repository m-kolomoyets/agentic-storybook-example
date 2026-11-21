# figma-qa.config.ts shape

Type: grilling
Status: resolved
Blocked by: 06, 08

## Question

Project-specific pieces today (file keys are out: links live in stories, see Story → Figma mapping): `colors.ts` (parses `src/styles/tokens.css` HSL), `variables.ts kitColorToken` (Amber misspellings), `content.tsx` (icon glob, `KitIcon`), `theme.ts` branding, dark backdrop assumption, `FORCED` pins. Decide the config surface: which become config, which become conventions, which stay in stories; defaults; validation.

## Answer

Resolved 2026-11-21 (grilling). Config is optional; every key has a default.

```ts
// figma-qa.config.ts (project root)
export default defineConfig({
    tokens: { prefix: '--color-' },          // tokens read at runtime from preview CSSOM; no file list
    tokenName: (variable) => string | null,  // Figma variable → CSS var; default kebab(full path) + prefix; null/miss → value match (warning)
    icons: { glob: 'src/assets/icons/*.svg', name: (figmaName) => string }, // default name = kebab(last segment)
    refsDir: 'figma-qa/__refs__',
    maxDiffRatio: <kit default>,             // story parameters override
});
```

- **Tokens**: no file config. Read `--color-*` (prefix) from loaded stylesheets via CSSOM, `var()` aliases resolved, cascade order = truth.
- **Token naming**: generic kebab rule in kit; Amber quirks (drop `Colors/`, `alfa`, `detructive`) move to this repo's `tokenName`.
- **Icons**: kit Vite plugin turns `icons.glob` into a virtual module (`import.meta.glob` needs a literal); SVGs loaded `?raw` → no svgr dep. No files found → cells render without glyphs + doctor warning.
- **Config reaches browser**: functions (`tokenName`, `icons.name`) run in preview, so the plugin exposes the config file itself through a virtual module; CLI loads same file via Vite `loadConfigFromFile` (no new dep).
- **Validation**: hand-written checks in `defineConfig` + `doctor`; unknown keys = error, exit 2.
- **Not config**:
  - Backdrop: stays derived from page computed background (stories change it with normal backgrounds/decorators).
  - QA UI theme (`theme.ts`): kit-owned, dark only. No "brand theme".
  - Pointer-state pins (`FORCED`): stay story-owned class maps; kit ships no pseudo-state mechanism in v1; skill documents convention.
  - File keys, CI, Docker: out (links live in stories; CI/Docker in CLI flags/wizard).
