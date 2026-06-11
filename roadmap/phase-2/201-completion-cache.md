# Completion cache

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | L | phase-2, area:cache | 101 |

## Problem

Identical or near-identical contexts hit the API every time. Stage 2 in the provider is literally an empty comment (`/* Stage 2: Cache */`). During steady typing, backspacing, and cursor movement, a large fraction of triggers could be served locally at < 16 ms.

## Tasks

- [ ] Create `src/services/completionCache.ts`: LRU (cap ~200 entries / configurable memory bound) keyed by `hash(model, normalizedPrefix, normalizedSuffixHead)`.
- [ ] Position-aware reuse: if cursor moved forward within a previously suggested region and typed text matches, serve the remaining suffix from cache (generalizes today's single-slot continuation to N entries surviving across lines/files).
- [ ] Backspace reuse: deleting back into a region the cache covers re-serves the suggestion.
- [ ] Invalidation: document edits outside the typed-through region invalidate entries for that document range; document close clears per-doc entries; config/model change clears all.
- [ ] Normalize keys (trailing whitespace of prefix) to raise hit rate without correctness loss.
- [ ] Wire into provider Stage 2; cache successful post-processed completions on the way out.
- [ ] Metrics hooks: hit/miss counters (consumed by 205).
- [ ] Unit tests: keying, LRU eviction, every invalidation path, position-aware reuse.

## Acceptance criteria

- Type → backspace → retype the same text: second pass serves from cache (log shows `cache-hit`, no API call).
- > 30% hit rate during a 10-minute steady dogfooding session (measure via counters).
- No stale completion served after an edit inside the cached region (version/range invalidation test).

## Out of scope

- Cross-session persistent cache; semantic similarity matching.

## Code references

- `src/providers/inlineCompletionProvider.ts:40` — empty Stage 2 placeholder
- Issue 004's `CompletionSession` — cache supersedes/wraps single-slot state
