# Acceptance tracking (full / partial / reject)

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-2, area:telemetry | 004 |

## Problem

We don't know whether suggestions are accepted, partially accepted, or rejected. Without this signal there is no honest quality metric, no input for personalization (401), ranking (408), or session-aware behavior (406), and no way to validate that prompt changes help.

## Tasks

- [ ] Attach `command` to each `InlineCompletionItem` → fires on full accept with `{completionId}`.
- [ ] Detect partial accepts (word/line accept commands) and type-through via document-change correlation against the active `CompletionSession`.
- [ ] Detect rejects: suggestion shown then dismissed (Esc) or abandoned (typed divergent text / moved away).
- [ ] Define `CompletionOutcome` event: `{completionId, model, provider, languageId, shownAt, latencyMs, outcome: full|partial|reject|ignored, acceptedChars, suggestedChars}`.
- [ ] Emit through a small `TelemetryService` interface (sink-agnostic; local sink lands in 205).
- [ ] No document content in the event payload — metadata only.

## Acceptance criteria

- Dogfooding session produces correct outcome events for: Tab accept, word-accept, Esc, type-through full text, type-divergent.
- Zero code content in any emitted event (audit the type + a runtime log sample).

## Out of scope

- Stats UI (205); using the signal for ranking/personalization (401, 408).

## Code references

- `src/providers/inlineCompletionProvider.ts:150-156` — item creation (attach command here)
- `src/providers/inlineCompletionProvider.ts:135-138` — existing type-through detection to reuse
