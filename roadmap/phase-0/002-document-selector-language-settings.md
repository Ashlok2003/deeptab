# Restrict document selector + per-language enable/disable

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | S | phase-0, area:provider | — |

## Problem

The provider registers with `{pattern: '**'}` — no scheme filter. It fires in SCM commit inputs, output panes, settings editors, and other non-file documents. There is also no way to disable completions for specific languages (e.g. markdown, plaintext, .env files).

## Tasks

- [ ] Register provider for explicit selectors: `[{scheme: 'file'}, {scheme: 'untitled'}]`.
- [ ] Add settings: `deeptab.enable` (global bool), `deeptab.disabledLanguages` (string[], default `["plaintext", "scminput"]`).
- [ ] Check language/enable settings at the top of `provideInlineCompletionItems` (settings can change at runtime; selector alone is not enough).
- [ ] Never trigger in documents matching sensitive defaults: `.env*`, files matched by `files.exclude`-style glob setting `deeptab.excludedGlobs`.

## Acceptance criteria

- Typing in SCM commit box, output panel, or settings UI never triggers a request (verify via output channel).
- Adding a language ID to `disabledLanguages` stops completions in that language without reload.
- `deeptab.enable: false` fully disables the provider.

## Out of scope

- Per-workspace policy files (issue 403).

## Code references

- `src/extension.ts:17` — `registerInlineCompletionItemProvider({pattern: '**'}, …)`
