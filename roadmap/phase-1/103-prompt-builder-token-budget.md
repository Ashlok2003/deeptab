# Prompt builder + token budget manager

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-1, area:context | 101 |

## Problem

As context sources multiply (buffer, imports, recent edits, LSP, cross-file), assembling them ad hoc per request will produce inconsistent prompts and budget overruns. Need one deterministic assembly point.

## Tasks

- [ ] Create `src/context/tokenBudget.ts`: budget per model (from profile context window minus completion reserve), allocation per source class with priorities.
- [ ] Create `src/prompt/promptBuilder.ts`: takes ordered `ContextItem[]` (`{source, content, priority, tokens}`) + model profile → final prompt (FIM or chat). Assembly order: instructions → cross-file snippets → imports/scope → suffix → prefix (prefix closest to the generation point).
- [ ] Eviction: when over budget, drop/truncate lowest-priority items first; never truncate the near-cursor prefix below a floor (e.g. 256 tokens).
- [ ] Define `ContextSource` interface (`gather(document, position) → ContextItem[]`) so each future source (105, 302, 305, 306) plugs in without builder changes.
- [ ] Debug command `Deeptab: Show Last Prompt` — dumps the exact assembled prompt to output channel (developer trust + debugging).
- [ ] Unit tests: eviction order, floor protection, deterministic output for fixed input.

## Acceptance criteria

- All requests flow through the builder; provider has no inline prompt assembly left.
- Over-budget input degrades by documented priority order, never by exception or silent provider truncation.
- `Show Last Prompt` reflects exactly what was sent.

## Out of scope

- The individual context sources themselves.

## Code references

- `src/providers/inlineCompletionProvider.ts:59-69` — inline message construction to be replaced
