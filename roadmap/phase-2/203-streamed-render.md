# Streamed first-line render

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | M | phase-2, area:provider | 104 |

## Problem

The provider accumulates the entire stream before returning anything (`for await … result += chunk`). Perceived latency = full generation time, not time-to-first-token. The streaming client exists but its benefit is thrown away.

## Tasks

- [ ] Return the completion list as soon as the first line (or first N≈10 tokens) has streamed in, while generation continues.
- [ ] Mechanism: VS Code inline completion API can't mutate a shown item — implement via re-trigger: show partial, keep streaming into the session buffer, and let the continuation path serve the growing text on the next provider call; and/or `vscode.commands.executeCommand('editor.action.inlineSuggest.trigger')` when a meaningful extension lands. Evaluate both; pick the one with least flicker.
- [ ] Run post-processing incrementally: sanitize/truncation checks on the partial text before first render (never flash a markdown fence).
- [ ] Single-line mode: first newline ends the request early (abort remainder — token savings).
- [ ] Telemetry split: time-to-first-render vs time-to-complete (feeds 205).

## Acceptance criteria

- Perceived first-character latency drops to ≈ provider TTFB + debounce (verify in stats).
- No visible flicker/jumping ghost text during extension of a shown suggestion.
- Single-line completions abort the stream at first newline (visible token/latency savings in log).

## Out of scope

- Provider racing (207).

## Code references

- `src/providers/inlineCompletionProvider.ts:191-216` — full accumulation in `callCompletionApi`
