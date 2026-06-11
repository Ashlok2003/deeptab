# Multi-line completions

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | M | phase-1, area:provider | 104 |

## Problem

Everything is tuned for short continuations ("next few characters"). The high-value moments — empty function body, after a `:`/`{`, blank line inside a block — deserve whole-block suggestions.

## Tasks

- [ ] Block-open detection in trigger policy: cursor at end of line ending in `{`/`:`/`=>`/`(`, or on an empty line inside an indented block, or directly after a comment line describing intent.
- [ ] Two generation modes with distinct budgets: `single-line` (max ~64 tokens, stop at `\n`) vs `block` (max ~512 tokens, stop heuristics from 104 + dedent-below-opening-indent).
- [ ] Indentation correction: re-indent model output to match editor settings (tabs/spaces, width) and the anchor line's level.
- [ ] Setting `deeptab.multiline`: `auto` (detection) | `always` | `never`.
- [ ] Truncate blocks at the first line whose indent dedents past the block opener.

## Acceptance criteria

- Typing a function signature + `{` then newline yields a plausible full body as ghost text.
- Mid-expression cursor still gets single-line completion (no surprise 20-line blocks).
- Accepted blocks match the file's indentation style exactly.

## Out of scope

- Replacement/deletion edits (303); diagnostics validation of blocks (307).
