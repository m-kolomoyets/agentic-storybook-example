# Figma QA

Checking implemented Storybook stories against their Figma designs, and packaging that check for reuse across projects.

## Language

**Spec extraction**:
Turning a Figma node into the expected values (size, color, typography, spacing) a story must match.
_Avoid_: Parsing, Figma import

**Comparison**:
Checking a story's computed styles against the expected values from spec extraction, producing a verdict per property.
_Avoid_: Calculations, calculations pipeline

**Pixel diff**:
Image-level comparison of a story render against a Figma render; separate from comparison.
_Avoid_: Visual diff (ambiguous)

**Figma report**:
The output of running spec extraction, comparison and pixel diff over a set of stories.
_Avoid_: Figma QA report, design report

**Figma story**:
A story opted into the Figma report by the `figma` tag; it must link at least one component set.
_Avoid_: Matrix story, VRT story

**Cell**:
One rendered instance of a component held to exactly one Figma variant; derived from the variant's properties, never hand-bound to a node.
_Avoid_: Tile, sample

**Block**:
The cells of one Figma story that are held to one component set.
_Avoid_: Section, group

**Approval**:
A deviation from Figma recorded as deliberate, with its reason, against the cells it covers; the cells keep being measured.
_Avoid_: Ignore, exception, waiver

**QA kit**:
The installable package that brings the Figma report, its Storybook panel, agent skills and rules into a project.
_Avoid_: Kit (alone; collides with UI kit), plugin

**UI kit**:
The designers' Figma file holding the component sets, one page per component with all its states.
_Avoid_: Kit (alone), design system file
