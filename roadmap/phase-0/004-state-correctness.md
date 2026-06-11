# Version-aware completion state + honor temperature setting

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-0, area:provider | — |

## Problem

Two correctness bugs:

1. `pendingCompletion` / `lastCompletion*` are keyed only by URI + position, not `document.version`. An external change (formatter, git checkout, find-and-replace) that lands the cursor at the same position replays a stale suggestion.
2. `deeptab.temperature` is declared in `package.json` but `ApiClient` hardcodes `temperature: 0.1`.

## Tasks

- [ ] Introduce a `CompletionSession` type: `{uri, documentVersion, anchorPosition, text}` replacing the three loose `lastCompletion*` fields and `pendingCompletion`.
- [ ] Invalidate the session when `document.version` advanced by anything other than the user typing through the suggestion (compare expected vs actual version delta, or subscribe to `onDidChangeTextDocument` and diff change ranges against the suggestion region).
- [ ] Invalidate on editor switch away and on document close.
- [ ] Read `temperature` from `ConfigurationService` (add getter + plumb into request body); clamp to [0, 1].
- [ ] Unit tests: stale-version replay rejected; continuation across version bumps caused by accepted typing still works.

## Acceptance criteria

- Reformatting the document (`Shift+Alt+F`) then returning cursor to the old position never replays the old suggestion.
- Changing `deeptab.temperature` in settings changes the request body value (visible in request log).

## Out of scope

- Caching (issue 201) — this issue is about not serving *wrong* state, not about serving more cached state.

## Code references

- `src/providers/inlineCompletionProvider.ts:16-19` — loose state fields
- `src/api/apiClient.ts:89` — hardcoded temperature
