# Completion history & recovery

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P2 | M | phase-4, area:ui | 204 |

## Problem

A dismissed suggestion is gone forever. Users regularly dismiss something, type a bit, and realize the suggestion was right — re-triggering may produce something different. No way to browse or recover what was offered.

## Tasks

- [ ] Create `src/services/completionHistory.ts` (to create): ring buffer (≈100 entries, session-scoped, optional persistence) of `{completionId, file, position, text, shownAt, outcome}` — populated from 204's events plus the suggestion text.
- [ ] Command `Deeptab: Completion History` — quick-pick of recent suggestions (file, time-ago, first-line preview); selecting one previews full text and offers Insert at Cursor / Copy.
- [ ] Command `Deeptab: Restore Last Suggestion` — re-show the most recently dismissed suggestion at its original position if document region unchanged (`document.version`-range check), else insert-at-cursor fallback with notice.
- [ ] Default keybinding for restore (e.g. `Ctrl+Alt+\`), conflict-checked.
- [ ] Privacy: history contains code → memory by default; persistence opt-in (`deeptab.history.persist`), cleared by `Deeptab: Clear History`; respect policy exclusions (403) — no history entries for excluded files.

## Acceptance criteria

- Dismiss a suggestion, type elsewhere, run restore → original suggestion re-offered correctly.
- History quick-pick shows session suggestions with working insert/copy.
- Excluded-file suggestions never enter history.

## Out of scope

- Cross-session search; diff-view of history entries.
