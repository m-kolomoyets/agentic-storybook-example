# 14: figma-qa scaffold

**What to build:** `figma-qa scaffold <url...> --story <path>` turns a UI-kit page, section, frame or single set into a starter Figma story in a kit-owned sibling `<Component>.figma.stories.tsx`.

**Blocked by:** 04 Figma sync with REST stub

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Collects every `COMPONENT_SET` under each URL; set URL → that set
- [ ] Writes only the sibling `.figma.stories.tsx`: title = sibling story's meta title + `/Figma` (static read; fallback path-derived), `tags: ['figma', '!autodocs']`, `component` via sibling's import
- [ ] Entry names = last `/` segment of set name, component prefix stripped, kebab-case; collisions → numeric suffix + warning
- [ ] Layout: `columns` = `State` else axis with most options; `sections` = `Size` if present and ≠ columns else null; written explicitly
- [ ] Each block's `renderCell` stub returns null with TODO → report shows cells missing
- [ ] Re-run appends only sets not already linked (file key + node id); never renames/reorders/removes; vanished sets → warning
- [ ] `--dry-run` prints the diff; no token → exit 2 + wizard hint; fetch warms refs cache
- [ ] Generated story passes `report` as all-missing (exit 0) until cells written
