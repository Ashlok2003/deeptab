# Custom completion policies

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | M | phase-4, area:security | 103 |

## Problem

Teams and privacy-conscious users need declarative control: never run on these paths, never send matching content to a provider, cap context size. Settings cover the basics (002); a per-workspace policy file makes it reviewable, committable, and enforceable — the compliance story.

## Tasks

- [ ] Define `.deeptab/policy.json` schema (publish JSON schema for editor validation):
  ```json
  {
    "exclude": ["**/*.env*", "secrets/**", "**/*.pem"],
    "disableLanguages": ["plaintext"],
    "redactPatterns": ["(?i)api[_-]?key\\s*[:=]\\s*\\S+", "AKIA[0-9A-Z]{16}"],
    "maxContextTokens": 2000,
    "singleLineOnly": ["json", "yaml"],
    "allowProviders": ["groq"]
  }
  ```
- [ ] Create `src/services/policyService.ts` (to create): load + watch the file; merge order: defaults < user settings < workspace policy (policy is most restrictive wins for security fields).
- [ ] Enforcement points:
  - trigger policy (003): `exclude`, `disableLanguages`
  - context engine (103): `maxContextTokens`, and **redaction pass over every outgoing prompt** (`redactPatterns` + built-in secret patterns: AWS keys, private key headers, bearer tokens) replacing matches with `[REDACTED]`
  - provider selection: `allowProviders`
  - cross-file source (306) and history (402) respect `exclude`
- [ ] Built-in default redaction always on, even with no policy file.
- [ ] `Deeptab: Validate Policy` command — parse errors surfaced clearly; invalid policy → fail closed (most restrictive).
- [ ] Unit tests: merge precedence, redaction correctness, fail-closed behavior.

## Acceptance criteria

- Prompt containing a planted fake AWS key shows `[REDACTED]` in `Show Last Prompt` and the wire request.
- Policy `exclude` glob stops completions in matching files without reload.
- Malformed policy file → completions keep working under most-restrictive defaults + visible warning.

## Out of scope

- Org-level policy distribution (505).
