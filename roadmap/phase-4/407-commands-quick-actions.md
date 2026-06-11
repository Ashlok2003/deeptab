# Command palette & quick actions

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | S | phase-4, area:ui | 006 |

## Problem

Zero commands are contributed today. Every capability added across phases needs a discoverable control surface; this issue consolidates it.

## Tasks

- [ ] Create `src/ui/commands.ts` (to create) as single registration point; all commands prefixed `Deeptab:`.
- [ ] Core set (some delivered piecemeal by earlier issues — consolidate + ensure all exist):
  - `Enable` / `Disable` (global), `Enable/Disable for <current language>`
  - `Switch Provider`, `Switch Model` (quick-pick from profiles, 102)
  - `Set API Key`, `Clear API Key` (001)
  - `Show Stats` (205), `Show Last Prompt` (103), `Show Output`
  - `Completion History`, `Restore Last Suggestion` (402)
  - `Clear Cache` (201), `Reset Personalization` (401)
  - `Snooze` (406), `Force Offline Mode` (404)
  - `Validate Policy` (403)
  - `Report Bad Completion` — captures last prompt + completion + outcome to a local file for debugging; explicit user action, nothing sent anywhere
- [ ] Status bar click (006) → quick-pick menu of the most-used subset.
- [ ] `package.json` contributes: commands with categories; enablement (`when`) clauses so irrelevant commands hide.
- [ ] Integration test: every contributed command executes without error in a clean profile.

## Acceptance criteria

- Every listed command discoverable in the palette under "Deeptab" and functional.
- `Report Bad Completion` writes a complete local repro file (prompt, raw response, post-processed text, outcome).

## Out of scope

- Custom keybindings beyond restore/snooze defaults; webview settings UI.
