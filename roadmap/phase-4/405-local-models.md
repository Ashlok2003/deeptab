# Local model support (Ollama / llama.cpp / LM Studio)

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P1 | M | phase-4, area:provider | 102 |

## Problem

Fully-offline and zero-data-egress operation requires a local inference backend. Ollama, llama.cpp server, and LM Studio all expose OpenAI-compatible endpoints, so the existing client architecture extends naturally. This completes the privacy story and powers `LocalOnly` mode (404).

## Tasks

- [ ] Refactor provider registry: `PROVIDER_CONFIGS` in `src/api/apiClient.ts` → `src/api/providers/` (to create) with one adapter per provider implementing a common interface `{endpoint, auth, buildBody, parseStream}` (groundwork for 504's provider plugin point).
- [ ] Add `local` provider: setting `deeptab.local.endpoint` (default `http://localhost:11434/v1` for Ollama), `deeptab.local.model` (e.g. `qwen2.5-coder:1.5b`), optional API key (LM Studio compat); no auth header when keyless.
- [ ] FIM support via model profiles (102) — local coder models are exactly the FIM family; Ollama also supports native `/api/generate` with `suffix` for FIM models — evaluate vs OpenAI-compat path, pick per profile.
- [ ] Health check on configuration (endpoint reachable, model present) with actionable error ("run `ollama pull qwen2.5-coder:1.5b`").
- [ ] Latency expectations: local small models can beat network round-trips — tune default `max_tokens` lower; document recommended models (1.5B–7B coder class) in README.
- [ ] Provider priority setting `deeptab.providerOrder` replacing hardcoded first-key-wins, so local can be primary with cloud fallback (or vice versa).
- [ ] Contract tests against recorded Ollama responses.

## Acceptance criteria

- With Ollama running and configured: completions work with network disconnected, end to end.
- `providerOrder: ["local", "groq"]` → local primary, automatic failover (206) to Groq when local server down.
- Misconfigured endpoint → one actionable error, not per-keystroke noise.

## Out of scope

- Bundling/managing model downloads; GPU detection.
