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
