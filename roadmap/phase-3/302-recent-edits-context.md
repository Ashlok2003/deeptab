# Recent-edits context source

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-3, area:context | 301, 103 |

## Problem

The model can't see what the user just did. "User renamed `getUser` → `fetchUser` two lines up" is the single strongest predictor of the next edit, and commercial tools exploit it heavily.

## Tasks

- [ ] Create `src/context/sources/editHistorySource.ts` implementing the `ContextSource` interface from 103 (`src/context/contextEngine.ts` / `promptBuilder.ts`).
- [ ] Format last N edits (from `EditHistory`, issue 301) as compact diff snippets:
  ```
  // User's recent edits (most recent last):
  // file.ts:42:  - const user = getUser(id)
  //              + const user = fetchUser(id)
  ```
- [ ] Include cross-file edits (recent edits in other files), tagged with file path.
- [ ] Budget priority: just below the suffix window, above imports — recent edits are high-signal.
- [ ] Skip edits already visible inside the prefix/suffix window (dedup against buffer source).
- [ ] Prompt-injection hygiene: edits are code, rendered inside the context block, never as instructions.
- [ ] A/B-able flag `deeptab.context.recentEdits` (default on) so 501's eval harness can measure its lift later.

## Acceptance criteria

- `Show Last Prompt` displays recent-edit diffs when history is non-empty.
- Scenario: rename one call site of a function, place cursor at second call site, trigger → suggestion applies the same rename.

## Out of scope

- Automatic next-edit *location* prediction (304) — this issue only informs generation at the current cursor.
