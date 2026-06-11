# CI pipeline

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | S | phase-0, area:testing | 007 |

## Problem

No CI. Lint, compile, and tests only run when remembered locally; PR review tools (CodeRabbit) are the only automated gate.

## Tasks

- [ ] GitHub Actions workflow `ci.yml` on push + PR: `npm ci` → `npm run lint` → `npm run compile` → `npm run test:unit`.
- [ ] Integration tests job using `@vscode/test-electron` with `xvfb-run` on ubuntu-latest.
- [ ] Package smoke job: `npx vsce package` succeeds (catches `.vscodeignore` / manifest errors early).
- [ ] Cache `node_modules` / npm cache for speed.
- [ ] Branch protection on `main`: CI must pass.

## Acceptance criteria

- A PR with a TypeScript error, lint error, or failing unit test shows a red check.
- Full pipeline < 5 minutes.

## Out of scope

- Release/publish automation (issue 503).

## Code references

- `package.json` — scripts
