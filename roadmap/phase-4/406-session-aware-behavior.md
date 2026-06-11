# Session-aware trigger behavior

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P2 | M | phase-4, area:context | 204 |

## Problem

A static trigger policy annoys in both directions: firing eagerly while the user rejects everything (flow-breaking noise), and holding back while the user accepts everything (missed value). Acceptance signal (204) + session state (301) enable adaptation.

## Tasks

- [ ] Extend `src/core/triggerPolicy.ts` (003) with an aggressiveness scalar ∈ [0, 1] modulating debounce time, multi-line willingness, and suppression strictness.
- [ ] Adaptation rules (windowed over last ~20 outcomes, this session only):
  - rejection streak ≥ 5 → step aggressiveness down (longer debounce, single-line only)
  - acceptance rate > 50% in window → step up
  - `SessionState = refactoring` (301) → favor edit-style suggestions; `exploring` → near-zero triggering
- [ ] Floor/ceiling so it never fully silences or goes hyperactive; resets each session.
- [ ] Focus mode: command `Deeptab: Snooze (25 min)` — full suppression with status-bar countdown; cancellable.
- [ ] Transparency: current aggressiveness + last adaptation reason in status tooltip and stats view (205); setting `deeptab.adaptiveTriggering` (default on) to pin static behavior.
- [ ] Unit tests: adaptation steps from scripted outcome sequences; floor/ceiling; snooze expiry.

## Acceptance criteria

- Scripted rejection streak measurably reduces request rate (logs/stats).
- Snooze suppresses everything, auto-resumes, survives window reload gracefully (or cleanly cancels).
- `adaptiveTriggering: false` → behavior identical to static policy.

## Out of scope

- Cross-session learned aggressiveness (lives in 401 if ever).
