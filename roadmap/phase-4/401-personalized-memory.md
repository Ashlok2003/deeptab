# Personalized completion memory

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | L | phase-4, area:context | 204 |

## Problem

The engine treats every user and workspace identically. But accept/reject history (204) reveals durable preferences: naming style, preferred APIs (`axios` vs `fetch`), test idioms, comment habits. Commercial tools feel "tuned to you" because they exploit this.

## Tasks

- [ ] Create `src/services/personalizationService.ts` (to create); storage per workspace in `context.workspaceState` / `globalStorageUri`.
- [ ] Derive signals from `CompletionOutcome` events + accepted text metadata:
  - rejected-pattern counters (e.g. suggestions with comments rejected repeatedly → stop suggesting comments)
  - accepted-API vocabulary: identifiers frequently present in accepted completions
  - style fingerprints: quote style, semicolons, naming convention (camel/snake), indent — derivable from buffer too, but acceptance-weighted
- [ ] Consumption points:
  - prompt: short style-preferences block via a `ContextSource` (plugs into 103)
  - ranking: prior score for candidates (consumed by 408)
  - trigger policy: suppress patterns with high rejection rates (consumed by 406)
- [ ] Decay: signals age out (e.g. half-life 30 days) so changed habits aren't sticky forever.
- [ ] Commands: `Deeptab: Show Personalization Data`, `Deeptab: Reset Personalization` — full transparency, local only.
- [ ] Cap storage (~100 KB/workspace); no raw code stored — derived counters/fingerprints only.

## Acceptance criteria

- After consistently rejecting comment-bearing suggestions in a session, comment frequency in suggestions drops (observable in logs/stats).
- `Show Personalization Data` renders human-readable signals; reset works.
- Storage audit: no code content persisted.

## Out of scope

- Cross-machine sync; fine-tuning models; team-shared preferences (505).
