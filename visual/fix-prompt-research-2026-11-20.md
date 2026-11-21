# Figma fix prompt: research (2026-11-20)

Goal: decide whether the "fix prompt" that the Figma diff panel and report copy out (`fixPrompt`, `visual/figma/view.ts:243`) is enough for a coding agent to fix Figma-to-implementation drift correctly. The prompt must not depend on this project, and it should use the team's skills where they help. **[fact]** marks something checked in a source cited next to it. **[rec]** marks a recommendation.

## Verdict

No. The prompt reports the symptom well (variant, expected vs received, delta, tolerance), but four gaps can lead an agent to the wrong fix:

1. **No location.** It gives neither the Figma node URL or id nor a story id or source file. The agent has to search for them.
2. **No drift vs wrong-token distinction.** The UI computes it (`isDrift`), but the prompt doesn't use it. The prompt then says "Use tokens, not raw values", which in the drift case invites the agent to hardcode a value or repoint an already-correct token.
3. **No "approve instead" path and no stop condition.** The prompt never says when to stop, or that recording an approval is a legitimate outcome.
4. **Project specifics leak in:** `pnpm vrt figma`, the "Figma diff panel", and the nearest-token notes that come from this kit's CSS.

The batch variant repeats the whole preamble per cell (Badge: 14 prompts, about 12 KB) and doesn't group cells that share one root cause.

## 1. Current prompt, as generated

**[fact]** Builder: `visual/figma/view.ts:243-275`. Copy-all joins prompts with `\n\n---\n\n` in `report.ts:211-217` and `.storybook/figma-panel.tsx:731-740`. The report's _Repeated issues_ rows use a separate one-line prompt with a different verify line (`report.ts:42`, `:343`, `:361`).

Real output, from running `fixPrompt` on `visual/.results/figma/results/ui-badge--figma-matrix.json` (Node 26, see Method). This is the worst Badge cell:

```text
Fix Badge story "Figma Matrix" → Size=Big · State=Updating · Tone=Neutral · Type=Label · Leading=Icon · Mode=None.
Figma: Badge.
Pixels differ 0.4% (allowed 5.0%).

Mismatched properties:
- Component Width: expected 64px, received 46px. Δ −18px, allowed ±2.25px.
- Component Height: expected 24px, received 30px. Δ +6px, allowed ±1px.
- Component Background: expected hsl(217.5 8.2% 38% / 0.06) (≈ --color-surface-fan-badge-updating (Δ7)), received hsl(0 0% 100% / 0.039) (= --color-border-remote-default → --color-white-alpha-4 +13). Δ Δ166 RGB · α −0.02, allowed ±3 per RGB channel.
- Text "FAN 3" Left offset: expected 8px, received 10px. Δ +2px, allowed ±1px.
  … (6 more text rows) …
- Icons Count: expected 1 (Icon), received 0. Δ −1, allowed exact.

Use tokens, not raw values. Leave matching variants unchanged.
Verify: run `pnpm vrt figma`, then Reload the Figma diff panel.
```

A drift case (8 of the Badge issues are drift by `isDrift`):

```text
- Component Background: expected hsl(145.7 63.9% 48.8% / 0.1) (≈ --color-surface-tag-positive → --color-green-alpha-500-10 (Δ5)), received hsl(146.4 61.6% 50% / 0.102) (= --color-surface-tag-positive → --color-green-alpha-500-10). Δ Δ5 RGB, allowed ±3 per RGB channel.
```

A pixel-only case (Checkbox; Figma set name `Check box outline blank`):

```text
Pixels differ 46.8% (allowed 5.0%).
No property mismatch: root size, radius, fill, texts and icons are within tolerance.
The difference is inside the component (inner glyph, stroke or fill). Compare the Figma and story images.
```

Sizes measured: Badge has 14 failing cells, with prompts of 545 to 1458 chars (12,167 in total). Checkbox and Radio have 6 each, at about 460 chars.

## 2. Sufficiency checklist

| Need | Current | Evidence | Risk if missing |
| --- | --- | --- | --- |
| Figma node URL/id | **Missing**: only the set name (`Figma: Badge.`). The result holds `block.set.url` and `cell.variant.id` (`types.ts:109,131`) | view.ts:247 | The agent can't call Figma MCP (`get_design_context`) on the exact variant, and has to guess or ask |
| Code location | **Missing**: story title and name only, no story id (`storyId` exists, `types.ts:139`) or file | view.ts:246 | The agent greps. Shared primitives make it likely to edit the wrong layer |
| Variant → code mapping | `whenText(props)` lists Figma props, not the story args or `renderCell` mapping | view.ts:97 | A wrong mapping gets "fixed" in the component. The docs list three outcomes: bug, wrong mapping, deliberate deviation (FIGMA-TESTING.md:184) |
| Expected vs received with units | **Yes**: px, HSL, delta, tolerance per row | view.ts:262-268 | Delta prints doubled: `Δ Δ5 RGB` (view.ts:265 adds `Δ`, and spec.ts:46 already returns `Δ5 RGB`). This is a bug |
| Token names | Nearest **code** token per side (`= …` exact, `≈ … (Δn)` nearest), worked out from the kit CSS (colors.ts:1-7, 88-111). They are not Figma variable names, and the spec doesn't capture bound variables (`FigmaSpec`, types.ts:21-35) | | `≈` reads like a binding when it is only a nearest match |
| Drift vs wrong token | **Missing from the prompt.** Computed by `isDrift` (view.ts:162-167) and shown only in the panel and report (report.ts:164-165) | | Drift: the component is right and the token's *value* differs. The agent may hardcode the Figma hsl (violating "use tokens") or swap to another token. Wrong token: swap the token in the component, not the token file |
| Tolerance | Yes, per row | | — |
| Pixel-only guidance | Yes, but names no image files (`cell.files.figma/actual/diff`, types.ts:127) | view.ts:255-259 | "Compare the images" with no paths for the agent to open |
| Verify command | `pnpm vrt figma` plus "Reload the Figma diff panel" | view.ts:19, 272 | Project-specific. A headless agent can't press Reload |
| Stop condition | **Missing** | | The agent may over-fit (tweak until pixels pass) or keep editing |
| Don'ts | Only "use tokens" and "leave matching variants unchanged" | view.ts:271 | Nothing on: don't edit Figma refs or baselines, don't add `approved`/`ignore` entries or raise tolerances to go green, don't change token *values* globally without checking their consumers |
| Approve path | **Missing** (the status hint has it: issues.ts:13 "Fix the code, or approve the deviation in the story (ADR 0002)") | FIGMA-TESTING.md:22, 196 | The agent forces code to match Figma where the deviation is deliberate (WCAG hit target or focus ring), or approves without a reason |
| Batch shape | N full prompts joined by `---` | report.ts:211-217 | The same root cause is fixed N times. The repeated preamble costs tokens. The report's `repeatedRows` grouping (report.ts:316-369) isn't used in copy-all |

### Ambiguities that cause wrong fixes

- **Drift (same token on both sides).** The panel's own copy says "the Figma variable's value has drifted; the code is right" (view.ts:162). So the prompt tells the agent to "Fix" something that may be correct. Three valid outcomes, and one of them is outside code:
  - update the token value in the token file, which is global and needs a check of its consumers;
  - ask design to fix the Figma variable;
  - approve the deviation.

  Editing the component is always wrong here.
- **Wrong token (different tokens).** The fix is in the component's class or variant. Editing the token file instead would repaint every other consumer.
- **Several cells sharing one cause.** For example, every Size=Big cell has `Font size 10 ≠ 12`. A per-cell prompt invites per-variant overrides instead of one `cva` size-variant change.
- **Size mismatch / comparator error.** The image check failed on dimensions (issues.ts:41). The fix is the root box, so pixel numbers should be ignored until it matches.
- **"Leave matching variants unchanged"** isn't checkable without the list of passing variants, or the rule "re-run and confirm the pass count didn't drop".

## 3. Project leakage

| Leak | Where | Parameterize as |
| --- | --- | --- |
| `pnpm vrt figma` | `COPY_COMMAND`, view.ts:19, used at :272 and report.ts:42 | `{verifyCommand}` from config. Fallback text: "re-run the Figma comparison" |
| "Reload the Figma diff panel" / "open the report" | view.ts:272, report.ts:42 | Drop it. Agents read `{resultFile}` (JSON) instead |
| `story "Figma Matrix"`, the Storybook-only "story" vocabulary | view.ts:246 | `{target}` (story id or route) plus `{sourceFile}` |
| `--color-*` token notes from `src/styles/tokens*.css` | colors.ts:6-7, 54-57 | Keep as data, labelled "nearest code token". The prompt explains `=` vs `≈` once |
| ADR 0002, `approved:` / `ignore:` field names | issues.ts:13, types.ts:61-76 | `{approvalMechanism}`, e.g. "add an entry to the story's approved list with the reason" |
| `FigmaMatrix` / `renderCell` | FIGMA-TESTING.md:184 | "the variant → props mapping in `{mappingFile}`" |

**[rec]** Make `fixPrompt(story, entry, ctx)` take a `ctx: { verifyCommand, resultFile, sourceFile?, approval }` from one config, and leave the rest of the template static.

## 4. Skills and subagents

### What exists (primary sources)

**[fact]** Phenomenon skills: repo `github.com/Phenomenon-Studio/phenomenon-skills` (local clone remote), installed plugin `phenomenon` at commit `be95bd575f1d` (`~/.claude/plugins/installed_plugins.json`). Skill names and descriptions come from the `SKILL.md` frontmatter under `~/.claude/plugins/cache/phenomenon-skills/phenomenon/be95bd575f1d/skills/`:

| Skill | Frontmatter | Fit for fixing a Figma diff |
| --- | --- | --- |
| `figma-qa` (design-qa/figma-qa/SKILL.md) | Visual QA, React UI vs Figma: "pairs each Figma node… measures computed styles… reports every diff". **"Read-only by default… Fix diffs only when the user asks"** (:8). Classes: token / value / structure / behaviour (:59-62). "Point each diff at the file and line that owns the value" (:76). Accepted deviations are marked `accepted` (:78) | It overlaps the comparator, which already measured. Its value here is **locating the owning file:line** and the four-class vocabulary. Worth it for pixel-only cells, which need a screenshot comparison |
| `react`, `typescript`, `accessible-html-jsx` (react-core/*) | `user-invocable: false` | They trigger automatically when the agent writes React or TSX. Naming them is optional |
| `triage-feedback` (triage/triage-feedback/SKILL.md) | "Use when the user pastes… a QA ticket, or another agent's review finding". "**changes no source code**" (:8). Verdicts include **by design** (:32). Hardcodes project paths (`docs/ui-redesign/phases/`, `packages/core`, :14, :38) | Good for the "fix or approve?" call on ambiguous cells. Not a fixer. Its path assumptions aren't portable |

**[fact]** The Phenomenon docs page (`phenomenon-studio.github.io/phenomenon-skills/design/`) lists animation and design skills plus `figma-qa`. It gives no invocation syntax and no fix workflow.

**[fact]** Matt Pocock skills: primary repo `github.com/mattpocock/skills` (`plugin.json` `repository`, and the marketplace clone remote), installed `mattpocock-skills` 1.3.1:

| Skill | Frontmatter | Fit |
| --- | --- | --- |
| `diagnosing-bugs` | "Diagnosis loop for hard bugs…". Phase 1 is "Build a feedback loop" (SKILL.md) | **Pixel-only and comparator-error cells.** The comparator run already is the tight loop |
| `tdd` | "build features or fix bugs test-first" | Low fit. The red test already exists (the Figma run). Writing another test per style value is over-engineering |
| `code-review` | Reviews "since a fixed point"; "Runs both reviews in parallel sub-agents" | Optional final gate on a batch fix. Costs extra agents |
| `implement` | `disable-model-invocation: true` | Can't be triggered by a prompt. Manual `/implement` only |

### How invocation actually works

**[fact]** Claude Code (code.claude.com/docs/en/skills):

- Skills load "when relevant" by matching their description. Only descriptions sit in context, and "full skill content only loads when invoked".
- `/name` runs a skill directly only "at the start of your message". A name later in the text "counts as your permission… Claude… judges from your wording whether you asked it to."
- `disable-model-invocation: true` removes the description from context, so it can't be triggered by prose.
- `user-invocable: false` hides a skill from `/` while Claude can still invoke it.
- Plugin skills are namespaced `plugin:skill` (for example `phenomenon:figma-qa`).

So a pasted prompt **can** make Claude use a skill by name ("use the figma-qa skill"), but it's a judgement call, not a guarantee. A leading `/skill` is the only deterministic trigger, and a pasted multi-section prompt can start with only one.

**[fact]** Subagents (code.claude.com/docs/en/sub-agents):

- Invoked by description, by name ("Use the test-runner subagent…"), or by `@`-mention.
- "With nothing configured, a subagent that Claude spawns from your main conversation starts in the background." Background subagents get permission prompts surfaced in the main session, and have "a smaller built-in tool set". `AskUserQuestion` is removed from every subagent.
- Subagents don't see "the skills you've already invoked" but can still invoke skills through the Skill tool.
- They spend their own tokens. The page has no warning about concurrent edits; `isolation: worktree` is the only isolation it offers.

**[fact]** Portability:

- Cursor loads `.agents/skills`, `.cursor/skills` and `.claude/skills`, applies skills automatically by description, offers manual `/` invocation, and honours `disable-model-invocation` (cursor.com/docs/context/skills).
- Codex supports explicit invocation (`$skill` or `/skills`, or naming the skill in the prompt) and implicit invocation by description, discovering `.agents/skills` (learn.chatgpt.com/docs/build-skills, redirected from developers.openai.com/codex/skills).
- All three follow the Agent Skills standard (agentskills.io, cited by Claude Code skills docs).

### Recommendation [rec]

- **Name skills in a conditional, agent-agnostic line, and never rely on them.** For example: "If you have these skills, use them: `figma-qa` to locate the owning file, `diagnosing-bugs` for pixel-only cells." Naming them works in Claude Code, Codex and Cursor. Description matching is the fallback, and the prompt must still work when no skill is installed.
- **No `/slash` prefix.** It is agent-specific and only works at the start of a message.
- **No background or parallel fix agents by default.** Cells of one component share a file (`cva` variants), so parallel editors race on the same lines. Background agents can't ask whether to approve or fix, and every agent costs its own tokens. At most:
  - one read-only subagent to locate files (`Explore`) for a large batch;
  - one per-component fixer, and only with worktree isolation;
  - a final `code-review` if wanted.
- Don't name `tdd`, `implement` (it can't be triggered from a prompt) or `triage-feedback` (paths not portable, no-edit by design) in a fix prompt. Mention `triage-feedback` only in an "approve or fix?" side prompt.

## 5. Proposed template (project-agnostic)

Each line is there because a gap in section 2 needs it. Placeholders are `{…}`. Sections render only when they have data.

### Single issue

```text
Fix a design drift: the implementation differs from its Figma source of truth.

Target: {component} — variant {figmaProps}
Figma: {variantNodeUrl} (node {nodeId}; set {setUrl})
Code: {sourceFile} · rendered by {target} · variant mapping in {mappingFile}
Images: figma {figmaPng} · implementation {actualPng} · diff {diffPng}
Pixels: {ratio} differ (allowed {maxRatio}){sizeNote}

Mismatches (expected = Figma, received = implementation):
- {element} {property}: expected {expected}, received {received} ({delta}; tolerance {tolerance}){kind}

Kinds: [wrong token] use the token Figma uses in this component; don't touch the token's value.
[token value drift] both sides resolve to the same token, so its value differs from Figma. Don't edit the component. Report it as a token-file or design change, listing the token's consumers, instead of fixing it here.
[value] replace the raw or misplaced value with the matching token or scale step.
[structure] add or remove the element as Figma shows.
"= token" means an exact match, "≈ token" the nearest token by colour (not a confirmed Figma binding).

Rules:
- Fix the owning component or variant definition, not this one cell. Never hardcode Figma's raw values.
- Don't edit Figma refs, baselines or tolerances, or the approved/ignore lists, to make it pass.
- If the difference is deliberate (accessibility, a documented decision) or the mapping is wrong, stop and say so. Propose {approvalMechanism} with a reason; don't add it yourself.
- If your agent has these skills, use them: figma-qa to locate the file that owns each value; diagnosing-bugs if the cause is unclear (pixel-only or size mismatch).

Done when `{verifyCommand}` shows this variant within tolerance and no previously matching variant fails. Report each change as file:line, and anything you didn't fix and why.
```

Why each part is there:

- **Target / Figma / Code / Images:** these remove the search step and give a Figma MCP-ready id. All the values exist in `FigmaStoryResult` or `FigmaCellResult`, except `sourceFile` and `mappingFile`, which need a story-to-file index (`index.json` `importPath`).
- **`{sizeNote}`:** "image sizes differ, so fix the root box first", from `imageErrorText`.
- **`{kind}`:** worked out per issue. Drift comes from `isDrift`. Wrong token is when both notes name tokens and they differ. Count and presence are structure. Everything else is value. The four classes reuse figma-qa's vocabulary (figma-qa/SKILL.md:59-62).
- **Kinds legend:** this is the drift vs wrong-token distinction. It says where *not* to edit.
- **Rules:** one line each for the four wrong-fix modes in section 2, and a conditional skill line.
- **Done when:** a stop condition plus a no-regression guard, and a report back in file:line form.

### Batch (one component, many cells)

```text
Fix design drift in {component}: {failCount} of {total} Figma variants differ.
Figma set: {setUrl} · Code: {sourceFile} · mapping {mappingFile}

Shared causes (fix once, at the variant/axis level):
1. {element} {property}: expected {expected}, received {received} ({kind}) — {n} variants: {axisSummary, e.g. "all Size=Big"}
…
Cell-specific:
- {figmaProps} ({nodeId}): {element} {property} expected {expected}, received {received} ({kind})
…
{Kinds legend, Rules and Done-when lines as above, once}
Work sequentially in one session; fix shared causes first, re-run, then cell-specific ones.
```

- Grouping reuses `repeatedRows` (report.ts:316) and `blockConclusion` (issues.ts:150-154) logic. This cuts tokens and stops per-cell overrides.
- A copy across several components becomes one block per component. Say "one component at a time". Parallel fixing is only safe with worktree isolation (sub-agents docs).

## 6. Risks

- **Concurrent edits:** background or parallel agents editing the same component or token file. The docs offer only worktree isolation. **[rec]** Keep fixes sequential.
- **Token cost:** each subagent spends its own tokens (sub-agents docs). The batch form here is about 3x smaller than the current Badge copy-all (estimate, not measured).
- **Skill misfire:** `figma-qa` is read-only by default and may produce a full QA report instead of fixing. It's scoped in the template to "locate the owning file". `triage-feedback` assumes another repo's paths. `tdd` adds tests that the comparator already covers.
- **False "drift":** `isDrift` compares nearest *code* tokens, not Figma variable bindings. Two different Figma variables with near-equal values both look like drift. **[rec]** Capture `boundVariables` in the spec sync so the prompt can name the actual Figma variable.
- **Over-long prompts:** keep the legend and rules once per batch. Drop "matching" rows. Cap cell-specific rows (e.g. 20) and point at `{resultFile}` for the rest.

## Method

`fixPrompt` was run on the existing results with a scratch script that only reads them: `node gen.mts` importing `visual/figma/view.ts` (Node 26 type stripping). No project files changed. Docs fetched 2026-11-20: code.claude.com/docs/en/skills, code.claude.com/docs/en/sub-agents, cursor.com/docs/context/skills, learn.chatgpt.com/docs/build-skills, phenomenon-studio.github.io/phenomenon-skills/design/.
