# Local telemetry & stats view

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-2, area:telemetry | 204 |

## Problem

No measurements: latency, acceptance rate, cache hit rate, error rates are all invisible. Every future quality/performance claim in this roadmap needs these numbers; they must exist before Phase 3 work begins so improvements are provable.

## Tasks

- [ ] `src/services/telemetryService.ts` — local-first sink: in-memory aggregation + periodic flush to `context.globalStorageUri` (JSON, ring-buffer of daily files, ~30-day retention).
- [ ] Metrics: latency histograms (debounce-wait, TTFB, first-render, total) per provider/model; acceptance rate by language/provider/model; cache hit/miss; suppression counts by reason; error counts by class (auth/rate-limit/transient).
- [ ] Command `Deeptab: Show Stats` — webview or rendered-markdown doc with today/7-day numbers.
- [ ] Status bar tooltip shows headline numbers (p50 latency, acceptance %).
- [ ] **Privacy:** local only. Remote export = separate future opt-in issue; no network calls from this service. Document the stance in README.
- [ ] `Deeptab: Reset Stats` command.

## Acceptance criteria

- After a dogfooding session, `Show Stats` displays plausible p50/p95 latency, acceptance rate, cache hit rate.
- No file in storage contains code content (metadata audit).
- Performance budget check: telemetry adds < 1 ms overhead per request path.

## Out of scope

- Remote/opt-in export; A/B infrastructure (501 handles offline evals).
