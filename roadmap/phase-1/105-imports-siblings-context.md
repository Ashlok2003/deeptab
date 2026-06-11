# Imports & enclosing-scope context source

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | M | phase-1, area:context | 103 |

## Problem

With only a prefix/suffix window, the model can't see the file's imports (what libraries/symbols are available) or the signature of the enclosing class/function when the window doesn't reach that far up. Result: hallucinated imports and wrong member references in large files.

## Tasks

- [ ] Create `src/context/sources/fileStructureSource.ts` implementing `ContextSource`:
  - Extract the import/require block from the top of the file (regex per language family: TS/JS, Python, Go, Rust, Java; generic fallback = first contiguous import-looking lines).
  - Extract enclosing scope signatures via indentation/brace heuristics: class declaration line, enclosing function signature, sibling method names (signatures only, not bodies).
- [ ] Deduplicate against the prefix window (don't send the import block twice when the window already covers it).
- [ ] Priority below near-cursor buffer, above cross-file in the budget.
- [ ] Unit tests with fixture files per language.

## Acceptance criteria

- In a 1000-line TS file, completion at the bottom references actually-imported symbols.
- No duplicate import block in `Show Last Prompt` when cursor is near file top.

## Out of scope

- Full AST parsing (acceptable later upgrade: tree-sitter); LSP symbol queries (305).
