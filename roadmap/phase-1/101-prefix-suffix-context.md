# Prefix/suffix window context

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-1, area:context | 004 |

## Problem

The prompt currently contains only the current line's prefix (`document.getText(lineStart → cursor)`). The model cannot see what came before, what follows the cursor, the file name, or even the language. This is the single biggest quality limiter in the product.

## Tasks

- [ ] Create `src/context/sources/bufferSource.ts`: extract `prefix` (up to N lines / T_prefix tokens above + current line to cursor) and `suffix` (cursor to up to M lines / T_suffix tokens below).
- [ ] Defaults: ~60 lines / 1500 tokens prefix, ~20 lines / 500 tokens suffix; settings `deeptab.context.prefixLines`, `deeptab.context.suffixLines`.
- [ ] Include metadata in the prompt: relative file path, `languageId`.
- [ ] Approximate token counting (`chars/4` heuristic first; pluggable tokenizer interface for later).
- [ ] Truncate prefix from the top, suffix from the bottom — nearest-to-cursor text always survives.
- [ ] Pass structured `{prefix, suffix, filePath, languageId}` to the request layer (replaces raw string message build in the provider).
- [ ] Unit tests: window extraction at file start/end, cursor at line 0, truncation order.

## Acceptance criteria

- Request log shows multi-line prefix + suffix being sent.
- Completing inside a function body produces suggestions consistent with code above AND below the cursor (e.g. doesn't redeclare a variable defined two lines down).
- No request exceeds the configured token budget.

## Out of scope

- Imports/siblings extraction (105), cross-file (306), LSP (305).

## Code references

- `src/providers/inlineCompletionProvider.ts:48-50` — current line-prefix-only context
