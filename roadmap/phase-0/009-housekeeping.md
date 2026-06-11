# Housekeeping: license, stray artifacts, .env hygiene

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | S | phase-0 | — |

## Problem

Small items that block public release or confuse contributors.

## Tasks

- [ ] Choose and add a `LICENSE` file (MIT or Apache-2.0 recommended for adoption); set `license` field in `package.json`.
- [ ] Delete stray `out/services/shadowWorkspace.js[.map]` (compiled artifact of a deleted experiment; no source exists). Ensure `out/` is gitignored and a clean `npm run compile` from `src/` is the only producer.
- [ ] Confirm `.env` is gitignored; add `.env.example` documenting `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `FIREWORKS_API_KEY` as dev-only fallbacks.
- [ ] `.vscodeignore`: exclude `roadmap/`, `*.md` design docs (`architecture.md`, `sequence.md`, `pending-completion.md`), `.env*`, `src/`, tests from the packaged VSIX.
- [ ] Fill `CHANGELOG.md` for 0.0.1 (it currently has placeholder content).
- [ ] Delete `vsc-extension-quickstart.md` boilerplate.

## Acceptance criteria

- `npx vsce package` produces a VSIX containing only `out/`, `package.json`, `README.md`, `CHANGELOG.md`, `LICENSE`.
- Repo has no compiled files without matching sources.

## Out of scope

- Marketplace publishing (issue 503).
