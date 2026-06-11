# Debounce + trigger policy v1

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-0, area:provider | — |

## Problem

Every provider invocation that reaches Stage 4 fires an API request immediately. Rapid typing produces request churn (mitigated only by `AbortController` cancellation — wasted tokens and rate-limit pressure). There is no notion of "this is a bad moment to suggest."

## Tasks

- [ ] Create `src/core/debouncer.ts` — promise-based debounce that respects the `CancellationToken`; setting `deeptab.debounceMs` (default 100, range 0–500).
- [ ] Create `src/core/triggerPolicy.ts` — pure function `(documentState, position, recentSignals) → fire | suppress(reason)`. Initial rules:
  - suppress immediately after explicit dismissal (Esc) at same position until the user types again
  - suppress when cursor is mid-word and the typed word is not a prefix of any active suggestion
  - suppress inside comments/strings when `deeptab.suggestInComments` / `suggestInStrings` are false (use simple tokenization; TextMate scopes later)
  - suppress when selection is non-empty
- [ ] Log every suppression with reason to the output channel (debug level).
- [ ] Unit tests for each rule (pure module, no `vscode` import for the decision logic).

## Acceptance criteria

- Typing a 20-char identifier at speed results in ≤ 3 API requests (observed in output channel), not ~20.
- Esc-dismissed suggestion does not immediately re-appear at the same position.
- All policy rules covered by unit tests.

## Out of scope

- Adaptive/session-aware aggressiveness (issue 406).

## Code references

- `src/providers/inlineCompletionProvider.ts` — Stage 4 entry point
