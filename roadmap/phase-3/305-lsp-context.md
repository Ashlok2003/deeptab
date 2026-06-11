# LSP context source: types, signatures, diagnostics

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | M | phase-3, area:context | 103 |

## Problem

VS Code already knows the type of the variable at the cursor, the signature being called, and the errors in the file — for free, via installed language extensions. None of it reaches the prompt. Hallucinated members/arguments are the result.

## Tasks

- [ ] Create `src/context/sources/lspSource.ts` (to create) implementing `ContextSource`, using command-based LSP access:
  - `vscode.executeHoverProvider` at cursor and at identifiers near cursor → type info
  - `vscode.executeSignatureHelpProvider` when inside a call → active signature + param index
  - `vscode.languages.getDiagnostics(uri)` → errors/warnings within ± few lines of cursor
- [ ] Hard latency budget: all LSP queries raced against a ~50 ms timeout; on timeout, proceed without (never let a slow language server block completion).
- [ ] Format compactly: `// cursor: user: User` / `// calling: fetchUser(id: string, ctx: Context)` / `// error L42: Property 'nmae' does not exist`.
- [ ] Diagnostics enable fix-forward framing: when cursor is on/near an error line, prepend "the user is fixing this error" instruction (chat path) or just include the diagnostic (FIM path).
- [ ] Cache hover results per `(uri, version, position-bucket)` to avoid duplicate queries within a burst.
- [ ] Setting `deeptab.context.lsp` (default on).

## Acceptance criteria

- TS file: completing a method call on a typed object suggests real members (verifiable in `Show Last Prompt`: hover types present).
- Pathological/missing language server: completion latency unaffected (timeout path covered by test).

## Out of scope

- `executeDefinitionProvider` chasing into other files (overlaps 306; revisit there).
