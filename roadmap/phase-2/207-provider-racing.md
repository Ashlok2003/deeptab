# Provider racing (fast-first-token mode)

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P2 | M | phase-2, area:provider | 206 |

## Problem

Fast providers (Groq-class) give instant-but-weaker completions; better models are slower. Users currently choose one. A race can deliver fast perceived latency AND better quality when the better model arrives in time.

## Tasks

- [ ] Opt-in setting `deeptab.racing`: `{fast: {provider, model}, quality: {provider, model}}`, off by default.
- [ ] Fire both on trigger; render fast result on arrival; if quality result arrives before "render commit" (user hasn't started typing through the shown text and < T ms elapsed, T≈400), swap suggestion; else discard.
- [ ] Abort the loser immediately on commit (token cost control).
- [ ] Both results enter the cache (quality result preferred on key collision).
- [ ] Telemetry: how often quality result wins/swaps/discards; added token cost.
- [ ] Swap must reuse the no-flicker mechanism from 203.

## Acceptance criteria

- With racing on: first-char latency ≈ fast provider; visibly better suggestions when quality model lands in window.
- Racing off (default): exactly one request per trigger, behavior unchanged.
- Token spend visible in stats so the user can judge the cost.

## Out of scope

- N>2 candidates and scoring (408 generalizes this).
