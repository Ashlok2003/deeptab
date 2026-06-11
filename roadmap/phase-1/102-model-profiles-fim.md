# Model profiles + FIM prompting

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | L | phase-1, area:provider | 101 |

## Problem

Completions go through `/chat/completions` with a system prompt asking the model to "provide only the next few characters." Chat formatting wastes tokens, invites explanations/markdown fences in output, and ignores fill-in-the-middle (FIM) — the trained-for mode of code models (Qwen-coder, StarCoder, Codestral, DeepSeek-coder families). FIM with a suffix is both faster and dramatically more accurate.

## Tasks

- [ ] Create `src/prompt/modelProfiles.ts`: registry mapping model-id patterns → profile `{format: 'fim' | 'chat', fimTemplate?: {prefix, suffix, middle tokens}, stopSequences, endpoint: 'completions' | 'chat', maxCompletionTokens}`.
- [ ] Built-in profiles: Qwen-coder (`<|fim_prefix|>…<|fim_suffix|>…<|fim_middle|>`), StarCoder (`<fim_prefix>…`), CodeLlama/Codestral (`<PRE> <SUF> <MID>`), DeepSeek-coder; generic chat fallback for everything else.
- [ ] `ApiClient`: support `/completions` (non-chat) endpoint per provider where available; request body built from profile.
- [ ] Stop sequences from profile (e.g. `\n\n`, FIM end tokens) sent in the request — server-side truncation beats client-side.
- [ ] Setting `deeptab.modelProfile` to force a profile when auto-detection by model id fails; log which profile was selected per request.
- [ ] Sensible defaults: lower `max_tokens` for completion use (e.g. 256 single-line / 512 multi-line) instead of global 2048.
- [ ] Contract tests with recorded responses for one FIM model per provider.

## Acceptance criteria

- Configuring a Qwen-coder model on Groq/Fireworks sends a FIM-formatted `/completions` request (verified in log).
- Output contains no chat artifacts (no markdown fences, no "Here is the completion").
- Unknown models still work via chat fallback.
- Measurable latency drop vs chat path (shorter prompts, fewer output tokens).

## Out of scope

- Racing models (207); local models (405) — but profiles must be reusable by both.

## Code references

- `src/providers/inlineCompletionProvider.ts:59-69` — chat-style system+user message build
- `src/api/apiClient.ts:84-90` — request body construction
