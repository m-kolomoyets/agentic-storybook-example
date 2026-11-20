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
2. Start Docker Desktop, then run `pnpm vrt:browser`. This starts Linux Chromium (Playwright 1.65.1) on `127.0.0.1:3100`. Vitest stays on the host and drives that browser, so screenshots don't depend on the developer's OS.

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

The three tools above compare code with earlier code. `pnpm vrt figma` compares code with **Figma**: every variant of a registered Figma component set, rendered by a `FigmaMatrix` story and checked per cell (spec within 1px + pixel diff). The philosophy, the architecture, and the workflow from a component's first matrix to adopting a design change are in **[FIGMA-TESTING.md](FIGMA-TESTING.md)**.

```bash
pnpm vrt figma             # sync missing Figma sets, test every `figma` story, write visual/.results/figma/index.html
pnpm vrt figma --refresh   # re-read every set from Figma first
```

## Gotchas found during setup

- `@storybook/addon-vitest` turns off Vitest API file writes. The DIY project opts back in with `api: { allowWrite: true }`. The API server stays on localhost.
- `expect(page).toMatchScreenshot()` never stabilised: it timed out after 5 s. Screenshotting `document.body` works and still includes portalled overlays.
- The Storybook vitest plugin sets the viewport to 1200×900. Vitest's own `browser.viewport` setting doesn't apply.
- Chromatic's CLI uploads the whole Storybook; `--only-story-names` limits which stories get snapshots, which is what you're billed for.
