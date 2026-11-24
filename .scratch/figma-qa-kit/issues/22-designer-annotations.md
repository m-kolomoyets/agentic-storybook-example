# 22: Designer annotations in the report and the report skill

**What to build:** Dev Mode annotations pinned to nodes inside each linked component set travel with the refs. They show beside their cell or block in the panel, the HTML report and `--json`, and the report skill fact-checks each one against the project and reports a verdict. Stories 80, 81.

**Blocked by:** 15 Kit agent skills (skill criteria only; the kit criteria can start now)

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

## Context

A probe on 2026-11-24, run on a real frame with 3 annotations:

- REST `GET /v1/files/:key/nodes` returns `annotations: [{ label }]` on any node, instance sublayers included (ids like `I12:345;67:890`). Sync already makes this call with no `depth`, so the data is in the raw `/nodes` JSON the kit already keeps. REST sends plain text only: no category, no markdown (list markers and bold are lost), and no pinned properties.
- The Plugin API (`use_figma`) adds `categoryId`, resolved through `figma.annotations.getAnnotationCategoriesAsync()`. Categories are set per file, e.g. Development, Interaction, Accessibility, Content, Discussion, Question. It also adds `labelMarkdown` and `properties`.
- `subtreeHash` (`src/node/set-manifest.ts`) hashes the whole `/nodes` entry. So today an edit that only touches an annotation already changes the hash and re-requests `/images`.

The verdicts and check rules match the `figma-implement` skill in phenomenon-skills (PR #11):

- `applied`, `conflict`, `open`, `out of scope`;
- each annotation is split into claims, and each claim is checked against the code, the decision records, the frame and the other annotations;
- on a conflict, the code and recorded decisions hold until the user rules.

Scope: the kit reads linked sets in the UI kit file. Notes on screens in layout files belong to `figma-implement`, not this ticket.

## Criteria

- [ ] Sync collects the annotations from each set's whole subtree into its manifest, one entry per annotation: node id, node path from the set, the variant it sits under (or none for set level), and `label`.
- [ ] `--refresh` rebuilds them from the locally kept raw `/nodes` JSON with no new Figma call.
- [ ] An annotation-only edit updates the manifest without re-requesting `/images`: the image hash leaves annotations out. Record the hash decision in `## Answer`.
- [ ] The refs format change is additive. A manifest without the field reads as "annotations not synced", which is different from "none", and the report says to run `--refresh`. If it can't be kept additive, ship a `figma-qa migrate` step and bump the major (AGENTS.md rule). Record which one in `## Answer`.
- [ ] Per-story results JSON and `--json`: annotations under a variant's subtree attach to that cell, and set-level ones attach to the block.
- [ ] Panel and HTML report (one UI, `src/ui/`): notes show under their block and cell as plain text with line breaks kept. Their stories run in the `ui` Vitest project with axe.
- [ ] Human `report` output prints one count line per block that has notes (`notes: N`), not the note text.
- [ ] Annotations never change a verdict or the exit code.
- [ ] Report skill (`skills/figma-qa`) gains an annotations step:
  - read the notes from the per-story results;
  - resolve categories with a read-only `use_figma` script when it is available, otherwise record the category as `unknown`;
  - split each note into claims, then route each claim by category;
  - fact-check each claim against the code, ADRs and decision logs, the glossary, the cells, and the other notes;
  - give each annotation a verdict, and ask the user about every `conflict` and `open` before changing code;
  - end with a table: block, node, category, verdict, and the evidence or reason.
  
  Judgment stays in the skill, so no CLI command produces verdicts.
- [ ] Fixture test in both fixtures (sb10 and sb11), running the real CLI against the REST stub. The recorded `/nodes` gains one annotation on a variant's nested instance sublayer and one at set level. The test checks that:
  - the manifest holds both;
  - `--json` puts each on the right cell or block;
  - an annotation-only change makes no `/images` request (the stub counts calls);
  - an old manifest without the field still runs and prints the `--refresh` hint.
- [ ] README "Reading the output" for `report` covers the `notes:` line and the `--json` field, from a real fixture run (AGENTS.md rule).
