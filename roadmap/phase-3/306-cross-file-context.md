# Cross-file context v1

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | L | phase-3, area:context | 103 |

## Problem

Completions are blind to the rest of the project: the type defined in the next file, the util function everyone calls, the sibling test's setup pattern. Single-file context caps quality on any non-trivial codebase.

## Tasks

- [ ] Create `src/context/sources/crossFileSource.ts` (to create).
- [ ] Candidate file ranking (cheap, no embedding index in v1):
  1. files imported by the current file (resolve relative imports; tsconfig paths best-effort)
  2. recently *edited* files (from `EditHistory`, 301)
  3. recently *viewed* files (track `onDidChangeActiveTextEditor` recency)
  4. same-directory siblings, matching test/impl pairs (`foo.ts` ↔ `foo.test.ts`)
- [ ] Snippet extraction, not whole files: exported declarations/signatures, the specific symbols the current file imports from that file, trimmed to budget (reuse extraction heuristics from 105's `fileStructureSource`).
- [ ] Identifier-overlap scoring: prefer candidate snippets sharing identifiers with the near-cursor window.
- [ ] Budget priority below recent-edits and local buffer; cap (e.g. ≤ 25% of prompt budget).
- [ ] Respect exclusion globs (002/403) — never pull excluded/sensitive files into context for another file's request.
- [ ] Flag `deeptab.context.crossFile` (default on); per-source token spend visible in `Show Last Prompt`.

## Acceptance criteria

- Completing a call to a function defined in an imported neighbor file produces the correct signature/arguments.
- Prompt inspection shows snippets (signatures), not full file dumps.
- A file matching `excludedGlobs` never appears in any prompt (test).

## Out of scope

- Embedding/semantic index, repo-wide symbol database (a future v2; extensibility hooks come via 504).
