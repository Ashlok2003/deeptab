# Replacement & deletion rendering (minimal-diff edits)

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | L | phase-3, area:ui | 106 |

## Problem

Ghost text can only express *insertion at cursor*. Real edit prediction needs to express "change this line": delete some existing text, replace other parts. Without diff rendering, edit-aware suggestions (302/304) can't be shown.

## Tasks

- [ ] Create `src/postprocess/minimalDiff.ts` (to create): given buffer region + model's proposed region text, compute minimal edit: `{insertions: ghost-renderable, deletions: ranges, replacements}` (word-level diff, e.g. diff-match-patch style).
- [ ] Create `src/ui/deletionDecorationManager.ts` (to create): render deletions/replaced text via `TextEditorDecorationType` (strikethrough red, theme-aware) while insertion part renders as standard inline ghost text.
- [ ] Use `InlineCompletionItem.range` to express replace-at-cursor edits where VS Code supports it; decorations only for parts the API can't express.
- [ ] Atomic accept: Tab applies the entire edit (insert + delete) via one `WorkspaceEdit`; partial-accept disabled for replacement edits in v1.
- [ ] Dismissal clears all decorations immediately (Esc, cursor move, typing divergence) — no orphan strikethroughs ever.
- [ ] Extend `ReplacementEdit` type in `src/utils/types.ts` (the name already anticipates this).
- [ ] Unit tests for `minimalDiff`; integration test for decoration cleanup.

## Acceptance criteria

- Suggestion changing `getUser(id)` → `fetchUser(id, ctx)` renders strikethrough on `getUser`, ghost `fetchUser`, ghost `, ctx` — and applies atomically on Tab.
- No decoration survives dismissal in any path (switch editor, Esc, undo).
- Pure-insert suggestions behave exactly as today (no regression).

## Out of scope

- Cross-location jumps (304); multi-hunk edits in one suggestion (later iteration).

## Code references

- `src/utils/types.ts:22-25` — `ReplacementEdit`
- `architecture.md` — DeletionDecorationManager already in target diagram
