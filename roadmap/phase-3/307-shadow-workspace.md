# Shadow workspace validation

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P2 | L | phase-3, area:context, exploratory | 303 |

## Problem

Multi-line and replacement suggestions can introduce errors (type errors, unbalanced syntax, broken references). Showing edits that immediately produce red squiggles destroys trust. A previous shadow-workspace experiment was deleted (stray compiled `out/services/shadowWorkspace.js` remains, removed in 009); rebuild it properly, behind a flag, with a latency budget.

## Tasks

- [ ] Create `src/services/shadowWorkspace.ts` (to create): apply a candidate edit to a hidden copy of the document and collect diagnostics without touching the user's buffer.
- [ ] Mechanism evaluation (pick one, document the decision):
  - in-memory `vscode.workspace.openTextDocument({content})` + language association (cheap; many language servers won't fully analyze untitled docs)
  - temp file mirror in a `.deeptab-shadow` dir opened invisibly (heavier; real diagnostics)
- [ ] Async validation: show the suggestion immediately; validate in background; if validation fails within T≈300 ms, retract/repair the suggestion (retract = clear ghost text; repair = re-prompt with the diagnostic — keep simple in v1: retract only).
- [ ] Only validate multi-line/replacement suggestions (single-line insertions skip — not worth the cost).
- [ ] Debounce + budget: at most one validation in flight; skip when language server is cold.
- [ ] Flag `deeptab.shadowValidation` (default off until proven).
- [ ] Telemetry: validations run, retractions, added latency (via 205).

## Acceptance criteria

- A block suggestion referencing an undefined symbol gets retracted before/shortly after display with flag on.
- Flag off → zero behavior/latency change.
- No shadow artifacts (temp files, hidden editors) leak into the user's workspace UI or git status.

## Out of scope

- Running tests/builds in the shadow copy; multi-file shadow edits.

## Code references

- `architecture.md` target diagram; deleted experiment formerly at `out/services/shadowWorkspace.js`
