# Retry, failover, circuit breaker

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-2, area:provider | — |

## Problem

Any API error → completion silently returns null. A rate-limited or down provider means the extension just stops working with no recovery and no user-visible explanation. Multi-provider configuration exists but is wasted: only the first configured key is ever used.

## Tasks

- [ ] `src/api/retryPolicy.ts` — classify errors: `auth` (401/403 — don't retry, surface), `rate-limit` (429 — honor `Retry-After`, back off), `transient` (5xx/network — 1 retry with jitter, only if still relevant i.e. not cancelled), `client` (4xx other — don't retry, log).
- [ ] Failover: on rate-limit/transient failure, try the next configured provider for that request (respecting model availability per provider profile).
- [ ] Circuit breaker per provider: N failures in window → open for cooldown; requests skip straight to next provider; half-open probe after cooldown. State surfaced in status bar tooltip.
- [ ] Never-break-typing guarantee: all failure paths resolve to "no suggestion," never to thrown errors, modals, or notification spam (one notification max per distinct auth error).
- [ ] Unit tests with mocked fetch: each error class, failover order, breaker open/half-open/close transitions.

## Acceptance criteria

- Revoking the OpenRouter key mid-session: one clear notification, automatic failover to Groq (if configured), status bar shows degraded provider.
- Simulated 429 storm opens the breaker; recovery is automatic after cooldown.
- Latency budget: retry logic adds zero overhead on the happy path.

## Out of scope

- Offline mode state machine (404); racing (207).

## Code references

- `src/api/apiClient.ts:126-129` — current throw-on-error with no classification
- `src/api/apiClient.ts:53-64` — first-key-wins provider selection
