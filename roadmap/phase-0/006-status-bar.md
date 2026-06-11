# Status bar item

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | S | phase-0, area:ui | — |

## Problem

The extension is invisible: no way to see whether it's active, which provider is in use, whether a request is in flight, or why nothing is appearing. Debugging requires opening the output channel.

## Tasks

- [ ] Create `src/ui/statusBar.ts` with states: `idle` (`$(sparkle) Deeptab`), `requesting` (`$(loading~spin)`), `streaming`, `error` (`$(warning)` + tooltip with last error), `disabled`.
- [ ] Tooltip: active provider, model, last request latency, last error if any.
- [ ] Click → quick pick: Enable/Disable, Switch Provider, Open Settings, Show Output.
- [ ] Provider/ApiClient emit state events the status bar subscribes to (no direct coupling — small event bus or `EventEmitter` on provider).

## Acceptance criteria

- State visibly transitions idle → requesting → streaming → idle during a completion.
- Auth failure (bad key) shows error state with actionable tooltip, no modal spam.

## Out of scope

- Stats view (issue 205); focus mode (issue 406).

## Code references

- `src/extension.ts` — activation; `src/providers/inlineCompletionProvider.ts` — request lifecycle points
