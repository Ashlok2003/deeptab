# Wire IntentTracker into the composition root

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | S | phase-0, area:context | — |

## Problem

`src/services/intentTracker.ts` exists and classifies edits (`added`/`edited`/`pasted`) but is dead code: never instantiated in `extension.ts`, `finalizeIntent()` is an empty stub, and `dispose()` doesn't dispose its registered listeners (leak if it were instantiated).

## Tasks

- [ ] Instantiate `IntentTracker` in `activate()`; push onto `context.subscriptions`.
- [ ] Implement `dispose()`: dispose everything in `this.disposables`, clear maps.
- [ ] Implement `finalizeIntent()`: emit a typed event (`vscode.EventEmitter<FinalizedIntent>`) carrying `{type, filePath, affectedLines, durationMs}`; clear pending state.
- [ ] Expose `onIntentFinalized` and `getCurrentIntent()` for future consumers (trigger policy, prompt builder).
- [ ] Log finalized intents to output channel (debug) so behavior is observable before any consumer exists.
- [ ] Unit tests for `classifyIntentType` and the 1.5 s continuation window.

## Acceptance criteria

- Output channel shows finalized intent events while editing.
- Deactivating the extension disposes all listeners (no orphan handlers — verify via test that registers/disposes).

## Out of scope

- Feeding intents into the prompt (issue 302); richer classification (issue 301).

## Code references

- `src/services/intentTracker.ts:148` — empty `finalizeIntent()`
- `src/services/intentTracker.ts:157` — empty `dispose()`
- `src/extension.ts:11` — `activate()` never constructs it
