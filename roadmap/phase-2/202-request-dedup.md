# Request deduplication / single-flight

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | S | phase-2, area:cache | 201 |

## Problem

VS Code can invoke the provider multiple times for effectively the same context (cursor jitter, re-trigger after focus). Each invocation currently cancels the previous request and starts a new one — wasted tokens and worse latency than just awaiting the in-flight result.

## Tasks

- [ ] Single-flight map keyed by the same context hash as the cache: if an identical request is in flight, await it instead of aborting and re-issuing.
- [ ] Distinguish "same context re-request" (attach) from "context changed" (abort old, start new) — current behavior stays correct for the latter.
- [ ] In-flight entry resolves into the cache so attachers and future hits share one API call.
- [ ] Unit tests: two concurrent identical requests → one fetch; changed-context request → abort + new fetch.

## Acceptance criteria

- Log shows `attached to in-flight request` events during normal editing.
- No scenario where an aborted request's partial result is served to an attacher.

## Out of scope

- Speculative prefetch of likely next requests.

## Code references

- `src/api/apiClient.ts:77-78` — unconditional `cancel()` before each request
