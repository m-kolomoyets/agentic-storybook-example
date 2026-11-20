# Guidelines

Keep replies extremely concise. No unnecessary fluff, no long code snippets. Leverage caveman skill in full mode.

Whenever working with any third-party library, you MUST look up the official documentation to ensure up-to-date information. Use the DocsExplorer subagent for efficient documentation lookup.

## Project overview

SPA admin template built with React (React Compiler) + TypeScript + Vite.

## How to work in this repo

- Tech stack & project structure: see [`README.md`](README.md).
- Commands: see `scripts` in [`package.json`](package.json).
    - `pnpm` is the project-standard package manager. Always respect [`pnpm-workspace.yaml`](pnpm-workspace.yaml) config.
    - Prefer using defined `pnpm` scripts over raw execution of binary commands (e.g., use `pnpm tsc` instead of `npx tsc --build`).
- Code style & conventions: see [`.claude/rules/code-style.md`](.claude/rules/code-style.md).

## Storybook, tests, MCP

- Storybook 11 beta (`@storybook/react-vite` 11.0.0-beta.x, pinned; re-pin all `@storybook/*` together) — config in [`.storybook/`](.storybook). Addons: docs, a11y, vitest, designs (Figma), mcp, `@chromatic-com/storybook` (Visual Tests; needs a Chromatic project to run).
- Stories: colocated `src/**/<Name>.stories.tsx` (CSF3, `satisfies Meta<typeof X>`). Example: `src/components/ui/Button/Button.stories.tsx`.
- Figma link per story/meta: `parameters: { design: { type: 'figma', url: '<figma node URL>' } }`.
- Scripts: `pnpm storybook` (dev, :6006), `pnpm build-storybook`, `pnpm test:storybook` (Vitest browser mode, Playwright Chromium; every story = test, play fn + axe a11y, `a11y.test: 'error'` globally).
- MCP: `http://localhost:6006/mcp` (server `storybook` in `.mcp.json`; needs `pnpm storybook` running). Tools: `docs-list`, `docs-show`, `docs-show-story`, `stories-preview`, `stories-find-by-component`, `get-storybook-story-instructions`, `stories-changed`, `test-run`. Call `get-storybook-story-instructions` before writing stories.
- Known a11y debt: mark per story with `parameters: { a11y: { test: 'todo' } }` + comment, never disable globally.
- Story conventions (kit primitives, `src/components/ui/<Name>/<Name>.stories.tsx`) — **CSF Next** (`import preview from '#.storybook/preview'` → `preview.meta()` → `meta.story()`; `features.experimentalTestSyntax`). Pilot: `Button`, `Select`; other files still CSF3 (both work) until migrated. Minimum visible stories:
    - `Default` — args playground; simple props (variant, size, disabled, loading…) are Controls, never a story each.
    - `Matrix` — all variants × sizes × states, Figma cell links as a `design` array. The only Chromatic snapshot: `parameters: { chromatic: { disableSnapshot: false } }` (preview disables all others).
    - `*OnMobile` — only where the mobile branch renders differently (`globals: { viewport: { value: 'mobile2', isRotated: false } }`).
    - Extra stories only for compositions Controls can't express (render harness, `render` prop swap, Field integration).
    - Behaviour = `Story.test('does X', { args?, globals?, render? }, fn)`, not stories: every `fn()` arg asserted; portals via `within(canvasElement.ownerDocument.body)`; dates via props, never the clock.
- Chromatic: billed per snapshot (free plan 5,000/month). Runs in CI (`chromatic` job, TurboSnap via `onlyChanged`). Don't trigger Visual Tests ad hoc from the addon; never enable snapshots or modes globally.
- Figma: kit file `GPPlxspxcbP4kc13YwNJTH` → `https://www.figma.com/design/GPPlxspxcbP4kc13YwNJTH/Amber-UI-kit?node-id=<a-b>` on meta (component set) and per story (cell).

<!-- BEGIN:storybook-skills -->
<!-- Storybook updates this section on upgrade. Remove both markers to keep your own edits. -->
## Storybook
For every change to how the UI looks (you create, change, or delete a component, story, style, theme, or design token), follow these steps in order. Each step has a Storybook skill. First invoke the skills of all the steps, before you edit any file. Then follow each skill at its step.
1. `component-docs`: look up the components to reuse, with their props and usage examples, before you edit any file. Also when the user asks about a component's props, API, or usage.
2. `write-stories`: every component you create or change gets stories.
3. `test-stories`: run the story tests after every change, the way this skill says, never with a `package.json` test script, and fix what fails. Also when the user asks to run or fix story tests.
4. `ui-review`: publish a review that shows the user what changed, as your last step. Also when the user asks to see components or stories.
<!-- END:storybook-skills -->
