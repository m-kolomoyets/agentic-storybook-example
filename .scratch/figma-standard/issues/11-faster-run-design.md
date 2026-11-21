# Faster Figma report run: fetch + comparison design

Type: grilling
Status: open
Blocked by: 02, 03, 05

## Question

Combine findings from 02 (variables), 03 (REST semantics), 05 (profile) into decisions: call pattern (`depth`, batching, cache key, change detection), what is cached and where (committed `__refs__` vs CI cache), which comparison work is parallelised, deduplicated (one diff-map computation) or dropped, and a target run time for N stories.
