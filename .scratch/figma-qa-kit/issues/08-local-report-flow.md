# 08: Local report flow

**What to build:** `figma-qa report` behaves as the one local command: it picks a browser, collects only Figma stories, honours filters, reports phase timings, and opens the result.

**Blocked by:** 03 Offline report tracer; 05 Results model → panel + HTML report

**Status:** resolved

Spec: [Figma QA kit](../spec.md)

- [x] Docker present → pinned browser image started (`compose up --wait`); absent or `--host-browser` → host Chromium + "pixels not comparable to CI" banner in report and summary (warning only)
- [x] Static scan of story files for a `figma` tag literal → Vitest `include`; non-literal tags → file included
- [x] Positional filters (component name / story-id glob) intersect the scanned list
- [x] Local TTY opens the HTML report; prints panel URL when Storybook is up; `--no-open` opens nothing
- [x] Phase timings in `--json` and in the report
- [x] Never prompts; doctor-blocked state → exit 2 pointing at `figma-qa init`
- [x] Project alias `figma-report` documented

## Answer

Done 2026-11-24 in `Phenomenon-Studio/storybook-figma-qa` `main`, commit `c078566` (not pushed yet, so no CI run). Typecheck is green on the kit and both fixtures. `pnpm test` passes 126/126. New: `test/local-report.test.ts` (real CLI in `fixtures/sb10` and `fixtures/sb11`) and `test/story-scan.test.ts` (pure scan and filter rules). A real pinned-image run on Docker 29 passes in both fixtures with the same verdicts as host Chromium.

Decisions later tickets need:

- **Pinned image.** `mcr.microsoft.com/playwright:v<project's installed playwright>-noble`, not a version the kit fixes: a remote Playwright server only accepts clients of its own version, and the lockfile pins it for CI too. Ticket 17's service container should use the same rule. The spec line is updated.
  - Compose comes from stdin (`docker compose -p figma-qa -f - up --wait`), with no file shipped. It runs `npx -y playwright@<v> run-server` on container port 3100, mapped to `127.0.0.1:3100`, and a node TCP healthcheck. The container stays up between runs; a warm `up` takes about 2.5 s.
  - `figmaQa()` connects with `exposeNetwork: '<loopback>'` when the CLI sets `FIGMA_QA_BROWSER_WS`. `FIGMA_QA_BROWSER_PORT` moves the host port (tests).
  - "Docker present" means the `docker info` daemon answers; a stopped Docker counts as absent. If Docker is present but `compose up` fails, the run exits 2 and the message names Docker's own cause plus `--host-browser`.
  - On this machine the in-tree `visual-playwright-1` container already holds 3100, so parity (ticket 19) must stop it or set `FIGMA_QA_BROWSER_PORT`.
- **Scan.** The CLI opens Vitest with `createVitest` (setting `VITEST`/`TEST`/`NODE_ENV` first, as `startVitest` does, or addon-vitest adds no include), globs the Figma project's specs, and scans them as text. It then calls `vitest.start(<absolute files>)`. Vitest's file filters stand in for "pass as `include`", with the same effect.
  - Storybook's CSF indexer accepts only an array literal or a **same-file const** for `tags`. The "non-literal" fixture case is therefore `Glyph.figma.stories.tsx` with `tags: GLYPH_TAGS`.
- **Filters.**
  - A filter with `*`, `?` or `--` is a story-id glob; anything else is a component name, matched against the meta `component`, the title or one of its segments, or the file name (`Swatch`, `Swatch.figma`). `Swatch` therefore also selects `Swatch/Figma misconfigured`.
  - Static ids use Storybook's `sanitize` + `storyNameFromExport`.
  - Ids exist only inside addon-vitest's test body, so with globs the CLI `vitest.provide`s the selection. The setup file installs a hook, and the kit's preview loader calls it to `context.skip()` unselected stories.
  - A filter that matches nothing exits 2. With no filters and no Figma stories, the run exits 0 with a warning.
- **Blocked setup** (exit 2, "run `figma-qa init`"):
  - A static check that `.storybook/main.*` names the package runs in the `doctor` phase, before the browser.
  - A missing `figma-qa` Vitest project is detected in `collect`: its config reads the browser choice.
  - `doctor` runs both checks and adds `setup:` and `browser:` lines.
- **Summary.** It gains these fields:
  - `files`: the collected story files.
  - `timings`: ms for `doctor`, `browser`, `collect`, `tests` and `report`. The HTML report shows every phase except `report`, which is still running when it renders.
  - `panelUrl`.
  - `hostBrowser`: true only when host Chromium actually ran. The host warning is in `warnings`.
- **Open.** The report opens when stdout is a TTY and `CI` is unset, unless `--no-open` is given. It uses `$BROWSER` (`none` opens nothing), else `open` / `xdg-open` / `start`.
- **Panel URL.** The preset records `{ url: options.localAddress, pid }` in `node_modules/.cache/figma-qa/storybook.json` when `storybook dev`'s Vite server (middleware mode) starts. The report trusts it while the pid lives and the dev route serves this run's `run.json`. The URL points at the first non-pass story, else the first story: `?path=/story/<id>&addonPanel=<panel id>`.
- **Alias.** `"figma-report": "figma-qa report"` is documented in the kit README and the skill; ticket 12's init should write it.
- **Not done / for later.** `--ci` is still an unknown option, so `nightly.yml`'s `report --refresh --ci` exits 2 until ticket 11. No phase for sync time: sync happens inside `tests`. One shared compose project per machine means two projects pinned to different Playwright versions recreate each other's container.
