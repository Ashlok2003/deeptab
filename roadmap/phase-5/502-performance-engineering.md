# Performance: bundling, lazy activation, memory caps

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-5, area:provider | — |

## Problem

Production extensions are judged on startup cost and steady-state footprint. Current build ships raw `tsc` output (many files, slow module resolution), activates everything on `onStartupFinished`, and accumulating services (cache, history, edit log, personalization) need enforced bounds.

## Tasks

- [ ] esbuild bundling: single minified `dist/extension.js`; sourcemaps for dev; update `main`, `.vscodeignore`, launch configs; CI (008) builds the bundle.
- [ ] Activation budget: measure with `--prof-startup`; lazy-construct heavy services (context engine, personalization, history) on first completion request, not on activate. Target < 50 ms activation.
- [ ] Memory budget enforcement: hard caps already specified per service (cache ~200 entries, history ~100, edit log K=20/file, personalization ~100 KB) — add a periodic accounting log (debug) summing estimates; soak test: 4-hour session memory growth < 10 MB.
- [ ] Hot-path audit: `provideInlineCompletionItems` pre-API overhead < 5 ms p50 (profile trigger policy + context gathering; cache hits < 16 ms end-to-end).
- [ ] Disposal audit: every service implements + registers disposal; leak test from 007's suite extended to all services.
- [ ] Document perf budgets in CONTRIBUTING; add a simple perf smoke (timed unit test) to CI to catch egregious regressions.

## Acceptance criteria

- VSIX < 1 MB; activation < 50 ms on a cold profile.
- 4-hour dogfooding soak: stable memory, no listener leaks.
- Hot-path timings logged and within budget in stats (205).

## Out of scope

- WASM/native components; worker threads (revisit if tokenization/diff ever dominates profiles).
