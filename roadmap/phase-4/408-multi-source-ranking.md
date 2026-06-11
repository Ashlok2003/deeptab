# Multi-source suggestion ranking

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P2 | L | phase-4, area:context | 207, 401 |

## Problem

Once multiple candidates exist per trigger — racing providers (207), n>1 sampling, cache + fresh result — picking "whichever arrived" is naive. Need scoring, a winner, and cycling through alternatives.

## Candidate flow

```mermaid
flowchart LR
    A[Racing results 207] --> S[Scorer]
    B[n-sampling results] --> S
    C[Cache candidate 201] --> S
    S --> R{Rank}
    R -->|best| G[Ghost text]
    R -->|alternates| Y[Cycle list Alt+']'/Alt+'['']
    G -- outcome 204 --> W[Weight tuning / eval 501]
```

## Tasks

- [ ] Create `src/postprocess/ranking.ts` (to create): pure scorer over candidates `{text, source, model, latency}`. v1 feature set (weighted linear, hand-tuned):
  - syntactic validity (bracket balance, parseable by lightweight check)
  - buffer consistency: identifier overlap with near-cursor window; indentation match
  - personalization prior (401 signals)
  - length appropriateness for trigger kind (single-line vs block)
  - source prior (quality model > fast model > cache, configurable)
- [ ] Support `n` sampling parameter where providers allow it; setting `deeptab.candidates` (default 1 — ranking only activates when >1 or racing on).
- [ ] Cycling UX: wire VS Code's native inline-suggestion cycling (`InlineCompletionList` with multiple ranked items) — `Alt+]`/`Alt+[` work for free.
- [ ] Log per-candidate scores (debug) so weights are tunable; outcome events (204) record winner source for later weight evaluation in 501.
- [ ] Unit tests: deterministic ranking on fixture candidate sets; each scoring feature in isolation.

## Acceptance criteria

- With racing/sampling on, `Alt+]` cycles ranked alternates.
- Syntactically broken candidates never rank above clean ones (test fixtures).
- Stats (205) show acceptance rate per winner-source — data to validate the scorer.

## Out of scope

- Learned/ML ranker (revisit after 501 provides offline evaluation); semantic scoring via extra LLM calls.
