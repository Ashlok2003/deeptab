# IntentTracker v2: finalized intents + rolling edit history

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | L | phase-3, area:context | 005 |

## Problem

After issue 005, `IntentTracker` emits basic `added/edited/pasted` events. Edit-aware completion (the Cursor-Tab differentiator) needs more: a durable rolling history of *what changed* (before/after per edit), and a session-level read on what the user is doing (writing new code vs refactoring vs fixing).

## Tasks

- [ ] Extend `src/services/intentTracker.ts` (exists) into v2; new files: `src/services/editHistory.ts` (to create).
- [ ] `EditHistory`: per-file ring buffer of last K (≈20) finalized edits as compact before/after line diffs `{file, lineRange, before, after, timestamp, intentType}`; global recency list across files.
- [ ] Session summary: classify recent activity window into `writing-new` | `refactoring` (many small edits across existing lines/files) | `fixing` (edits near diagnostics) | `exploring` (navigation, no edits); expose `getSessionState()`.
- [ ] Better paste detection: use `rangeLength`/multi-line text instead of the current `text.length > 50` heuristic.
- [ ] Detect repeated-edit patterns: same before→after transform applied ≥ 2 times (e.g. rename) → emit `RepeatedEditPattern {before, after, occurrences}` event (consumed by 304).
- [ ] Memory cap + disposal audit (this component listens to every document change — must be cheap: < 0.5 ms per change event).
- [ ] Unit tests: diff capture across typing bursts, rename-pattern detection, session classification.

## Acceptance criteria

- After renaming a variable in two places, a `RepeatedEditPattern` event fires with the correct before/after.
- `getSessionState()` answers correctly during scripted editing scenarios (test fixtures).
- Profiled overhead per change event < 0.5 ms.

## Out of scope

- Feeding the prompt (302); jump UI (304).

## Code references

- `src/services/intentTracker.ts` — v1 from issue 005
- `src/utils/types.ts:32-42` — `IntentType`, `PendingIntent` to extend
