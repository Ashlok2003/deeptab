# Post-processing v1: truncation, dedup, bracket balance

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-1, area:context | 102 |

## Problem

Raw model output is shown as-is. Common failure modes: completion repeats the line that already exists below the cursor; unbalanced brackets at the truncation point; trailing partial tokens; chat-mode artifacts (markdown fences) when on the fallback path.

## Tasks

- [ ] Create `src/postprocess/` pure modules:
  - `truncation.ts` — cut at stop heuristics: first line that exactly duplicates the next buffer line; max-line limits (1 line in single-line contexts); FIM end tokens leaking into output.
  - `dedup.ts` — strip overlap between completion tail and buffer suffix (model often re-emits the closing `)` / `}` that already exists right of cursor).
  - `bracketBalance.ts` — trim trailing unbalanced openers, or close trivially when safe; language-aware pairs.
  - `sanitize.ts` — strip markdown fences / "Here is..." prefixes on chat fallback path.
- [ ] Pipeline order: sanitize → truncate → dedup → bracket balance; each step logs what it removed (debug).
- [ ] Reject entirely: whitespace-only results, results identical to existing buffer text.
- [ ] Unit tests per module with real-world failure fixtures (collect from output channel while dogfooding).

## Acceptance criteria

- Cursor before existing `)` + completion ending in `)` → no doubled paren after accept.
- Chat-fallback completion wrapped in ``` fences renders clean code.
- Fixture suite covers ≥ 10 observed real failure cases.

## Out of scope

- Minimal-diff replacement rendering (303); semantic validation (307).

## Code references

- `src/providers/inlineCompletionProvider.ts:75-84` — current "trim & show" handling
