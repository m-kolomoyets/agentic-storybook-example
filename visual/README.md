# Visual regression comparison: Chromatic vs Argos vs DIY

One set of stories, three tools, one run log. The goal is to compare how each tool behaves on real components and flows, not to keep all three running for good.

## What's under test

Stories tagged `vrt`:

```ts
export const Primary: Story = { tags: ['vrt'] /* … */ };
```

The tag also works on a meta, to cover a whole file. Every tool reads the same tag:

| Tool | Capture | Baselines & review | Wiring |
| --- | --- | --- | --- |
| DIY | Vitest `toMatchScreenshot` (pixelmatch), local or Docker browser | PNGs in `visual/diy/__baselines__` (git); diffs in `visual/.results/diy` | `vitest.config.ts` project `vrt-diy`, `visual/diy/setup.ts` |
| Argos | `@argos-ci/storybook` Vitest plugin, local or Docker browser, then upload | Argos web app | `vitest.config.ts` project `vrt-argos` |
| Chromatic | Cloud render of `storybook-static` | Chromatic web app | `visual/run.ts` (`--only-story-names` from tagged stories) |

Flows are stories with `play` functions. All three tools capture after `play` finishes. The plain `storybook` test project ignores the tag, so `vrt` stories still run their play and a11y checks there.

## Setup

1. Put the tokens in `.env.local` (see `.env.local.example`): `ARGOS_TOKEN` and `CHROMATIC_PROJECT_TOKEN`. Don't use the `VITE_` prefix: Vite can bundle `VITE_*` values into client code.
2. Start Docker Desktop, then run `pnpm vrt:browser`. This starts Linux Chromium (Playwright 1.65.1) on `127.0.0.1:3000`. Vitest stays on the host and drives that browser, so screenshots don't depend on the developer's OS.

## Run

```bash
pnpm vrt diy            # compare against committed baselines (Docker browser)
pnpm vrt diy --update   # write/refresh baselines, then review and commit the PNGs
pnpm vrt argos          # capture and upload; review/approve in Argos
pnpm vrt chromatic      # build Storybook, upload, cloud capture; review in Chromatic
pnpm vrt all            # all three, one after another
pnpm vrt diy --host-browser   # local Chromium instead of Docker; baselines are named per OS
```

Each run appends a record to `visual/runs.jsonl` (committed). That log is the input for the final comparison report:

```json
{
    "tool": "diy",
    "durationMs": 10843,
    "exitCode": 0,
    "browser": "docker-linux",
    "stories": 1,
    "passed": 1,
    "changed": 0,
    "failed": 0,
    "url": null
}
```

`changed` counts visual diffs. For DIY it counts screenshot mismatches. For Chromatic it is the change count, and on the first build it counts every new snapshot. Argos reports changes in its own build page, linked from the CLI output, so the log records `null` for it.

## Fairness rules

- Same stories (the `vrt` tag), same Chromium build for DIY and Argos (the Docker image). Chromatic always uses its own cloud browsers; that difference is part of the comparison.
- Each tool keeps its own default stabilisation. DIY imitates it with `STABILIZE_CSS` in `visual/diy/setup.ts`.
- Make baselines on the default branch first (`--update` for DIY; the first upload for Argos and Chromatic), then make a change and run all three.

## Figma reference (`pnpm vrt figma`)

Chromatic, Argos and DIY above are **code-vs-code**: they catch regressions against an earlier render, never drift from the design. None of them can use Figma as the baseline (Chromatic's Figma plugin shows a story next to a frame, without a diff). The `vrt-figma` Vitest project does that, DIY-style.

A story opts in with the `figma` tag and `parameters.figmaRef` pointing at **one variant node**, not the component set, and reproduces that cell's content (label, icons, state):

```tsx
export const FigmaMdDefault = meta.story({
    tags: ['figma', '!autodocs'],
    args: { size: 'md', children: 'Generate Automations', startIcon: <StarFourIcon />, endIcon: <StarFourIcon /> },
    parameters: { figmaRef: { url: `${FIGMA}8728-14523` } },
});
```

Keep it free of `.test()` children: the check runs after every test of the story, and a test's args change the render.

After the play function, two checks run (both reported; either fails the test):

1. **Spec, exact within 1px**: root size, corner radii and background, each text run (matched by its characters) for x, width, vertical centre, font family, size, weight, line height, letter spacing, colour and whether the font actually loaded, and each icon box (left-to-right order). Spec mismatches are real deviations. Approved ones (ADR 0002) go in `figmaRef.ignore` with the reason beside them.
2. **Image**: pixelmatch against Figma's 2x PNG (page at DPR 2, transparent canvas), allowing `figmaRef.maxDiffRatio` (default 5 %). Diff and actual go to `visual/.results/figma`.

Pixel-perfect isn't a usable gate. Figma's text renderer is not Chromium's, so glyph edges differ even when the layout matches exactly: the Button pilot matched the spec but still differed on 2.9 % of pixels, all on text edges and corner anti-aliasing. A zero-tolerance gate always fails, and a loose one hides small layout bugs. So the spec check is the gate, the image diff is for review, and once a story matches Figma the regression tools keep it there.

References are cached in `visual/figma/__refs__` (PNG plus the spec as JSON, with the Figma file `version`) and committed, so runs work offline and a design change shows up as a git diff. `FIGMA_TOKEN` (`.env.local`; a personal access token with file read scope) is only needed to fetch, and is read on the Node side only.

```bash
pnpm vrt figma             # compare (fetches refs that are not cached yet)
pnpm vrt figma --refresh   # refetch every ref from Figma, then compare
```

`--update` is refused for `figma`: it would replace Figma's PNG with a screenshot. `pnpm vrt all` runs only the three regression tools.

## Gotchas found during setup

- `@storybook/addon-vitest` turns off Vitest API file writes. The DIY project opts back in with `api: { allowWrite: true }`. The API server stays on localhost.
- `expect(page).toMatchScreenshot()` never stabilised: it timed out after 5 s. Screenshotting `document.body` works and still includes portalled overlays.
- The Storybook vitest plugin sets the viewport to 1200×900. Vitest's own `browser.viewport` setting doesn't apply.
- Figma: Vitest sanitises screenshot names (`--` → `-`); ref names use single dashes.
- Figma: the kit's `color-scheme: dark` paints the canvas #121212 even with `omitBackground`, so the 95 %-alpha button fill came out 241 instead of 254. The Figma setup forces `color-scheme: light` on the root (no native controls in the compared nodes).
- Figma: portable stories render into an anonymous `<body>` div, then the `withKitText` decorator div. The default root selector depends on that; use `figmaRef.selector` for anything else.
- Chromatic's CLI uploads the whole Storybook; `--only-story-names` limits which stories get snapshots, which is what you're billed for.
