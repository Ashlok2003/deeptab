# Next-edit prediction v1

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | XL | phase-3, area:context | 302, 303 |

## Problem

After the user accepts/makes an edit, the next edit is often predictable (remaining call sites of a rename, the matching update in a switch statement, the import for a newly used symbol). Today the user must navigate there manually. This is the marquee "Tab, Tab, Tab" experience.

## Tasks

- [ ] Create `src/core/nextEditPredictor.ts` (to create). Input: `RepeatedEditPattern` events + `EditHistory` (301) + current document.
- [ ] v1 deterministic candidates (no LLM round-trip):
  - rename pattern → text/word-boundary search for remaining `before` occurrences in current file (then open files)
  - new symbol used without import → import-block insertion candidate (pairs with 105's import extraction)
- [ ] v1.5 LLM-assisted: send pattern + candidate region to model, ask for the concrete edit at that location; render via 303's diff machinery.
- [ ] UX: after an accepted edit with a live pattern, show subtle gutter/inline hint at the next location ("Tab to jump"); Tab when no inline suggestion is active → jump + show predicted edit; Esc ends the chain.
- [ ] Keybinding contribution with `when` clauses that NEVER steal Tab from normal typing/suggestion accept (this is the riskiest UX detail — test exhaustively).
- [ ] Chain telemetry: jumps offered / taken / edits accepted per chain (via 204/205).
- [ ] Feature flag `deeptab.nextEdit` (default off until acceptance > 50% in dogfooding).

## Acceptance criteria

- Rename a function at one of three call sites → accept suggestion at second (via 302) → hint appears for third → Tab jumps and shows correct edit → Tab applies.
- Tab behaves normally in every non-chain context (regression suite for keybinding `when` clauses).
- Esc cleanly exits a chain, no residual hints.

## Out of scope

- Cross-file jump chains beyond open files; project-wide refactor automation.
