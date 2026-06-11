# Unit tests for pure pipeline logic

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-0, area:testing | 004 |

## Problem

The trickiest logic in the codebase — continuation/divergence matching, pending-replay checks, SSE chunk parsing — has zero test coverage. These are exactly the routines that regress silently when refactored.

## Tasks

- [ ] Restructure so the logic under test has no `vscode` import: extract continuation matching and pending-replay decisions into pure functions (`src/core/` or `src/utils/`) that take plain `{line, character}` positions; the provider becomes a thin adapter.
- [ ] Add a plain mocha (or vitest) unit-test runner that does NOT require the extension host; keep `@vscode/test-cli` for integration tests. Scripts: `npm run test:unit`, `npm run test:integration`.
- [ ] Tests — continuation prediction: exact prefix typed → remaining suffix; full text typed → state cleared; divergence → cleared; different line / backward movement → no continuation.
- [ ] Tests — pending replay: same doc+line+char → replay; any mismatch → cleared.
- [ ] Tests — SSE parsing: recorded fixtures in `src/test/fixtures/` covering happy path, multi-line chunks split across reads, `[DONE]`, malformed JSON line (skipped, not fatal), empty deltas.
- [ ] Tests — provider selection priority and no-key error.

## Acceptance criteria

- `npm run test:unit` runs in < 5 s with no VS Code download.
- Coverage on extracted pure modules ≥ 90% lines.
- Existing behavior unchanged (integration smoke test still passes).

## Out of scope

- Scenario replay harness (issue 501).

## Code references

- `src/providers/inlineCompletionProvider.ts:107-148` — `tryContinuePrediction`
- `src/providers/inlineCompletionProvider.ts:158-185` — `handleExistingPendingCompletion`
- `src/api/apiClient.ts:110-175` — `streamRequest`
