# Choose and provision the private registry

Type: task
Status: resolved
Blocked by: 08

## Question

HITL. Pick GitHub Packages vs npm org (cost, who can install, CI auth), create the scope, and record the package name, scope, and where the publish token lives.

## Answer

Decided with the human, 2026-11-21.

- **Registry**: GitHub Packages (npm registry, `https://npm.pkg.github.com`).
- **Package**: `@phenomenon-studio/storybook-figma-qa` (scope = org `Phenomenon-Studio`, lowercased). CLI bin stays `figma-qa`; config stays `figma-qa.config.ts`.
- **Publish token**: none stored. Publish only from the kit's own repo in `Phenomenon-Studio` via Actions `GITHUB_TOKEN` with `permissions: packages: write`. Consequence: kit source must live in a repo owned by `Phenomenon-Studio` (this repo is personal: `m-kolomoyets/agentic-storybook-example`).
- **Provisioning**: nothing to create up front; the scope exists with the org, the package is created on first publish and linked to the publishing repo.
- **Consumer install facts** (feed the wizard / CI fog):
  - `.npmrc`: `@phenomenon-studio:registry=https://npm.pkg.github.com` + `//npm.pkg.github.com/:_authToken=${NODE_AUTH_TOKEN}`. GitHub Packages requires auth for every install, even public packages.
  - Devs: classic PAT with `read:packages` (fine-grained PATs not supported by the npm registry).
  - Consumer CI in the org: `GITHUB_TOKEN` with `packages: read`, after granting the consumer repo access in the package's "Manage Actions access" settings.
  - `pnpm dlx @phenomenon-studio/storybook-figma-qa init` therefore needs the `.npmrc` + token first: the bootstrap chicken-and-egg belongs to the first-run wizard / install docs.
