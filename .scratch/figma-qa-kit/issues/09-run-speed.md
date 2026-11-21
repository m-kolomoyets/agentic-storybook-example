# 09: Run speed: pipelining + flatten cache

**What to build:** Per-cell overhead drops by pipelining pixel diffs and caching flattened refs.

**Blocked by:** 03 Offline report tracer

**Status:** ready-for-agent

Spec: [Figma QA kit](../spec.md)

- [ ] Capture cell N, fire Node diff unawaited, continue; story awaits all diffs before finishing
- [ ] Ref flatten memoized per (ref hash, backdrop) in memory + on disk under the local cache; unchanged inputs skip flatten
- [ ] File-level Vitest parallelism kept; no sharding, no per-block capture
- [ ] Per-cell afterEach ≤ 150 ms on the fixture, reported in timings (not asserted in CI)
- [ ] Verdicts identical to before the change on the fixture
