# Scaffold a Figma story from a UI-kit page

Type: grilling
Status: resolved
Blocked by: —

## Question

Story → Figma mapping allows enumerating a UI-kit page's sets only as an authoring aid. Decide: CLI command (`figma-qa scaffold <page-url>`) vs agent skill vs both (code over prose: deterministic part in CLI); what it writes (`design` entries named by code variant, `figmaMatrix.blocks[]`, `figma` tag — never `renderCell` bodies); how entry names map from Figma set names to code variants; layout choice; behaviour on an existing story (append missing sets, never overwrite); token/cache requirements.

## Answer

Grilled with the human, 2026-11-21.

1. **Form**: both. CLI `figma-qa scaffold <url...> --story <path>` does all deterministic work (enumerate sets, read axes, pick names + layout, write file). Kit skill adds judgment only: rename entries to real code variants, write `renderCell` bodies.
2. **Input**: any Figma node URL (page, section, frame, single set), repeatable; CLI collects every `COMPONENT_SET` under each (a set URL → that set).
3. **Target file**: separate kit-owned `<Component>.figma.stories.tsx` beside the component's stories. Scaffold creates/edits only that file; never AST-edits user story files.
   - meta `title` = sibling `<Component>.stories.tsx` meta title + `/Figma` (static read; fallback path-derived `Components/<C>/Figma`); `tags: ['figma', '!autodocs']`; `component` imported via sibling's import path.
   - Suffix is a scaffold convention only; discovery stays the `figma` tag (hand-written Figma stories elsewhere still work).
4. **Entry names**: set name's last `/` segment, component-name prefix stripped, kebab-case (`Button / Secondary elevated` → `secondary-elevated`); collision → numeric suffix + warning. No code introspection (cva keys) in v1.
5. **Layout**: `columns` = axis `State` if present else axis with most options; `sections` = axis `Size` if present and ≠ columns, else null; rest → rows. Written explicitly in each block.
6. **renderCell stub**: `renderCell: () => null` + `// TODO` per block → every cell `[data-figma-missing]`; unfinished scaffold fails the report visibly.
7. **Re-run**: append only sets not already a `design` entry (match fileKey+nodeId, not name); never rename/reorder/remove; set in file but gone from Figma → warning only. `--dry-run` prints the diff.
8. **Token/cache**: live `FIGMA_TOKEN` required (page enumeration uncached); none → exit 2 + wizard hint. Its one `/nodes` fetch also warms the refs cache for new sets.

Impact: cutover PR (Kit source repo and migrating this repo onto the kit, step 4) moves the 4 existing Figma stories into sibling `*.figma.stories.tsx` files.
