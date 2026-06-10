# Deeptab

**Context-aware, low-latency AI tab completion for VS Code.** Deeptab streams code suggestions from OpenRouter, Groq, or Fireworks directly into the editor as ghost text — with the long-term goal of matching the responsiveness and contextual intelligence of market-leading completion engines like Cursor Tab and GitHub Copilot.

> **Status: early-stage (v0.0.1).** The core completion loop works end to end. Most of the intelligence layer — context gathering, caching, ranking, next-edit prediction — is designed but not yet built. See [Current State](#current-state) and the [Roadmap](#roadmap).

---

## Table of Contents

- [Vision](#vision)
- [Problem Statement](#problem-statement)
- [Target Users](#target-users)
- [Current State](#current-state)
- [Architecture](#architecture)
- [Module Structure](#module-structure)
- [Current Gaps & Known Architectural Issues](#current-gaps--known-architectural-issues)
- [Roadmap](#roadmap)
- [Advanced Capabilities Catalog](#advanced-capabilities-catalog)
- [Performance Budgets](#performance-budgets)
- [Testing Strategy](#testing-strategy)
- [Observability](#observability)
- [Getting Started](#getting-started)
- [Extension Settings](#extension-settings)
- [Development](#development)
- [Contributing](#contributing)

---

## Vision

Tab completion is the highest-frequency AI interaction in a developer's day — it fires on nearly every keystroke. To be useful rather than annoying, a completion engine must be:

1. **Fast.** Perceived latency under ~200 ms or the suggestion arrives after the developer has already typed past it.
2. **Right.** Suggestions must reflect the surrounding code, the project's conventions, the symbols actually in scope, and the *edit the user is in the middle of making* — not just the current line.
3. **Quiet.** A wrong suggestion costs more than no suggestion. The engine must know when *not* to fire.
4. **Resilient.** Provider outages, rate limits, and offline work must degrade gracefully, never break the editor.

Deeptab's goal is a completion engine built around those four properties, provider-agnostic by design, and extensible enough that new context sources, ranking strategies, and models can be added without rewriting the pipeline.

## Problem Statement

Existing options force a trade-off:

- **Copilot / Cursor Tab** are excellent but closed: you cannot choose your model, inspect the context they send, self-host, or control cost.
- **Open-source alternatives** typically send naive context (current line or a fixed window), use chat-style prompting against models not tuned for fill-in-the-middle, and lack the state machinery (caching, speculative continuation, edit-intent tracking) that makes commercial tools feel instant.

Deeptab targets the gap: an open, provider-agnostic engine with the *engineering* of a commercial completion product — context pipeline, caching, intent tracking, latency discipline — while letting users bring their own model and key.

## Target Users

- **Developers who want model choice** — fast open-weight models on Groq/Fireworks, or any model via OpenRouter, swapped with one setting.
- **Cost-conscious users** — free-tier and cheap models, aggressive caching, full visibility into what is sent.
- **Privacy-conscious teams** — self-selected providers today; local/self-hosted endpoints on the roadmap.
- **Extension engineers** — a readable, well-factored reference implementation of a completion pipeline.

---

## Current State

An honest inventory, derived from the codebase.

### Implemented

| Capability | Where | Notes |
|---|---|---|
| Extension activation & provider registration | `src/extension.ts` | Registers `InlineCompletionItemProvider` for all files (`pattern: '**'`) on startup |
| Streaming completion client | `src/api/apiClient.ts` | SSE parsing, `AbortController` cancellation, common interface over OpenRouter / Groq / Fireworks |
| Provider selection | `src/api/apiClient.ts` | First configured key wins: OpenRouter → Groq → Fireworks |
| Pending-completion replay | `src/providers/inlineCompletionProvider.ts` | Returning to the exact cursor position replays the last suggestion with no API call |
| Continuation prediction | `src/providers/inlineCompletionProvider.ts` | As the user types characters matching the suggestion, the remaining suffix is shown without re-querying; divergence clears state |
| Reactive configuration | `src/services/configurationService.ts` | Singleton with change listeners, typed access, env-var fallbacks for keys |
| Diagnostic logging | throughout | Dedicated `Deeptab` output channel |

### Partially Implemented

| Capability | Where | Gap |
|---|---|---|
| Intent tracking | `src/services/intentTracker.ts` | Classifies edits as `added` / `edited` / `pasted` per line, but is **never instantiated** in `extension.ts`; `finalizeIntent()` and `dispose()` are empty stubs; classified intents go nowhere |
| Temperature setting | `package.json` / `apiClient.ts` | `deeptab.temperature` is declared in settings but the client hardcodes `0.1` |
| Tests | `src/test/` | Scaffold only — no meaningful coverage |
| Shadow workspace | `out/services/shadowWorkspace.js` | Compiled artifact of a deleted/unfinished experiment; no source file exists |

### Not Yet Built

- **Real context gathering** — the prompt currently contains *only the current line's prefix*. No suffix, no surrounding lines, no imports, no cross-file symbols, no diagnostics.
- **FIM prompting** — completions go through the chat endpoint with a system prompt; no fill-in-the-middle support.
- Debouncing, request deduplication, and completion caching.
- Multi-line edits, next-edit prediction, deletion/replacement rendering.
- Secret storage for API keys, status bar UI, commands, telemetry, acceptance tracking.

The mermaid diagrams in [`architecture.md`](./architecture.md), [`pending-completion.md`](./pending-completion.md), and [`sequence.md`](./sequence.md) describe the *target* pipeline (cache, context gathering, prompt builder, dedup, diff rendering); roughly a third of it exists today.

---

## Architecture

### Current pipeline (what runs today)

```
Keystroke
   │
   ▼
InlineCompletionProvider.provideInlineCompletionItems()
   │
   ├─ Stage 1: Pending-completion check ── same doc + exact position? → replay, no API call
   │
   ├─ Stage 2: (reserved: cache — not built)
   │
   ├─ Stage 3: Continuation prediction ─── typed text is a prefix of last
   │                                       suggestion? → show remaining suffix
   │
   └─ Stage 4: API call
        │  context = current line prefix only
        ▼
      ApiClient.complete()  ──►  OpenRouter / Groq / Fireworks (SSE stream)
        │  chunks accumulated; cancelled via AbortController on new request
        ▼
      InlineCompletionList → ghost text → Tab accepts / Esc dismisses
```

### Target pipeline (what we are building toward)

```
Keystroke ──► Debouncer ──► Trigger policy (should we even fire?)
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
        Early-exit layer               Context Engine
        ├─ completion cache            ├─ prefix/suffix window
        ├─ pending replay              ├─ recent-edit history (IntentTracker)
        └─ continuation predict        ├─ LSP: definitions, types, diagnostics
                                       ├─ cross-file: imports, siblings, recently
                                       │   viewed files, semantic neighbors
                                       └─ session signals (accept/reject memory)
                                              │
                                              ▼
                                       Prompt Builder
                                       ├─ token budget manager
                                       └─ FIM or chat formatting per model
                                              │
                                              ▼
                                       ApiClient (provider abstraction)
                                       ├─ retry / failover / rate-limit aware
                                       └─ streaming with early-render
                                              │
                                              ▼
                                       Post-processing
                                       ├─ stop-sequence & bracket truncation
                                       ├─ dedup vs. existing buffer text
                                       ├─ multi-source ranking (if N candidates)
                                       └─ minimal-diff computation
                                              │
                                              ▼
                                       Rendering
                                       ├─ ghost text (insertions)
                                       ├─ decorations (deletions/replacements)
                                       └─ next-edit jump hints
                                              │
                                              ▼
                                       Feedback loop
                                       └─ accept / partial-accept / reject →
                                          cache, personalization, telemetry
```

### Component responsibilities

| Component | Responsibility |
|---|---|
| `extension.ts` | Composition root: instantiate services, register provider/commands, own disposal |
| `InlineCompletionProvider` | Orchestrates the stage pipeline per request; owns completion-session state |
| `ApiClient` | Provider abstraction, streaming, cancellation, retries, failover |
| `ConfigurationService` | Typed reactive settings, secrets access |
| `IntentTracker` | Classifies the user's in-flight edit (typing new code vs. modifying vs. pasting) to inform trigger policy and prompt framing |
| Context Engine *(planned)* | Assembles ranked, token-budgeted context from buffer, LSP, cross-file, and session sources |
| Prompt Builder *(planned)* | Model-aware formatting (FIM templates vs. chat), stop sequences, budget enforcement |
| Completion Cache *(planned)* | Prefix-keyed LRU with position-aware invalidation |
| Telemetry *(planned)* | Local-first metrics: latency percentiles, acceptance rate, provider errors |

---

## Module Structure

Current layout, with planned modules marked:

```
src/
├── extension.ts                  # Composition root
├── api/
│   ├── apiClient.ts              # Streaming client + provider registry
│   ├── providers/                # (planned) one adapter per provider, incl. local/Ollama
│   └── retryPolicy.ts            # (planned) backoff, failover, rate-limit handling
├── core/
│   ├── pipeline.ts               # (planned) stage orchestration extracted from provider
│   ├── triggerPolicy.ts          # (planned) when to fire / suppress
│   └── debouncer.ts              # (planned)
├── context/
│   ├── contextEngine.ts          # (planned) source aggregation + ranking
│   ├── sources/                  # (planned) buffer, lsp, crossFile, editHistory, session
│   └── tokenBudget.ts            # (planned)
├── prompt/
│   ├── promptBuilder.ts          # (planned) FIM + chat formatting
│   └── modelProfiles.ts          # (planned) per-model templates, stop sequences
├── providers/
│   └── inlineCompletionProvider.ts
├── postprocess/
│   ├── truncation.ts             # (planned) stop sequences, bracket balancing
│   ├── dedup.ts                  # (planned) suffix-overlap removal
│   └── ranking.ts                # (planned) multi-candidate scoring
├── services/
│   ├── configurationService.ts
│   ├── intentTracker.ts
│   ├── completionCache.ts        # (planned)
│   ├── secretService.ts          # (planned) VS Code SecretStorage wrapper
│   ├── telemetryService.ts       # (planned)
│   └── shadowWorkspace.ts        # (planned) hidden-document validation of edits
├── ui/
│   ├── statusBar.ts              # (planned) state indicator, provider, latency
│   └── commands.ts               # (planned) toggle, switch provider, clear cache
├── utils/
│   └── types.ts
└── test/
    ├── unit/                     # (planned) pure-logic tests, no VS Code host
    ├── integration/              # extension-host tests
    └── fixtures/                 # (planned) recorded SSE streams, sample documents
```

Guiding rule: **everything that can be a pure function lives outside `vscode`-importing modules**, so the pipeline's logic (truncation, dedup, ranking, budget math, prefix matching) is unit-testable without an extension host.

---

## Current Gaps & Known Architectural Issues

Called out explicitly so they get fixed rather than fossilized:

1. **Context is a single line prefix.** `provideInlineCompletionItems` sends only the text from line start to cursor. No suffix, no neighboring lines, no file path or language hint. This is the single biggest quality limiter.
2. **Chat endpoint for a completion task.** Completions use `/chat/completions` with a system prompt asking the model to "provide only the next few characters." FIM-capable models (StarCoder/Qwen-coder/Codestral families) via a completions endpoint with proper `<fim_*>` templates will be faster and dramatically more accurate.
3. **API keys in plain settings.** Keys live in `settings.json` (sync-able, world-readable) and a local `.env`. They must move to VS Code `SecretStorage` with a guided setup command.
4. **`IntentTracker` is dead code.** It is never constructed; its `dispose()` doesn't dispose its listeners and `finalizeIntent()` is empty. Wire it into the composition root or it will silently rot.
5. **No debounce or trigger policy.** The provider relies entirely on VS Code's internal scheduling. Rapid typing produces request churn (mitigated only by cancellation), and completions fire in contexts where they shouldn't (strings of keystrokes mid-identifier, comments-only files, output panes — `pattern: '**'` has no scheme filter, so it matches SCM inputs and other non-file documents).
6. **`temperature` setting is ignored** — declared in `package.json`, hardcoded in `ApiClient`.
7. **Single-slot session state.** `lastCompletion*` and `pendingCompletion` are instance fields with no document-version awareness; an external edit (formatter, git checkout) at the same position can replay a stale suggestion.
8. **Stray build artifact.** `out/services/shadowWorkspace.js` has no corresponding source — delete the artifact (and keep `out/` out of the working tree) until the feature is rebuilt properly.
9. **No tests of the interesting logic.** Continuation/divergence matching and SSE parsing are exactly the kind of fiddly code that regresses silently.

---

## Roadmap

Phased so that each phase ships a usable improvement. Within a phase, items are roughly ordered.

> **Execution backlog:** every item below exists as a GitHub-issue-ready file in [`roadmap/`](./roadmap/README.md), with priorities, estimates, dependency graph (mermaid), acceptance criteria, and code references. That folder is the source of truth for execution; this section is the narrative summary.

### Phase 0 — Hardening the core loop *(now → short term)*

Make what exists correct, safe, and measurable before adding intelligence.

- [ ] **Secrets**: move API keys to `SecretStorage`; add `Deeptab: Set API Key` command; deprecate plain settings with a migration path. Remove `.env` usage from packaged builds.
- [ ] **Document selector**: restrict to real editors (`scheme: 'file'` / `untitled`), add per-language enable/disable setting (`deeptab.enabledLanguages`, `deeptab.disabledLanguages`).
- [ ] **Debounce + trigger policy v1**: configurable debounce (default ~75–150 ms); suppress triggers mid-word when no suggestion is active, inside long strings/comments (configurable), and immediately after an explicit dismissal.
- [ ] **State correctness**: key pending/continuation state by `(uri, document.version)`; clear on external document changes; honor `deeptab.temperature`.
- [ ] **Wire or remove `IntentTracker`**: instantiate in `extension.ts`, implement `dispose()`, implement `finalizeIntent()` to emit a typed event the pipeline can consume.
- [ ] **Status bar item**: idle / requesting / streaming / error states, active provider, last-request latency. Click → quick menu (toggle, switch provider).
- [ ] **Unit-test the pure logic**: continuation matching, divergence detection, SSE chunk parsing (recorded fixtures), provider selection.
- [ ] **CI**: lint + compile + unit tests on every PR; `vsce package` smoke build.

**Exit criteria:** zero known correctness bugs in the replay/continuation state machine; keys never stored in plaintext; p50 keystroke-to-request overhead < 5 ms.

### Phase 1 — Context engine v1 & FIM *(short term)*

The quality jump.

- [ ] **Prefix/suffix window**: send N lines above and M lines below the cursor (token-budgeted), plus file path and language ID.
- [ ] **FIM prompting**: add `modelProfiles` describing each model's template (`<|fim_prefix|>`-style), stop sequences, and whether to use `/completions` vs `/chat/completions`. Auto-select format per configured model; keep chat as fallback.
- [ ] **Prompt builder + token budget manager**: deterministic assembly order (instructions → cross-file → local suffix → local prefix), truncation from the lowest-value end.
- [ ] **Post-processing v1**: stop at duplicate-of-next-line, balance brackets, trim trailing partial tokens, drop suggestions that duplicate existing buffer suffix.
- [ ] **Imports & siblings context**: include the file's import block and the signatures of the enclosing class/function (regex/indentation-based first; AST later).
- [ ] **Multi-line completions**: allow whole-block suggestions when the cursor is at a "block-open" location (after `:`/`{`/blank line in a function body).

**Exit criteria:** measurable acceptance-rate improvement over line-prefix baseline (tracked via Phase 2 telemetry); suggestions respect project indentation and local naming.

### Phase 2 — Speed, caching, and feedback *(short → mid term)*

Make it feel instant and start learning from the user.

- [ ] **Completion cache**: LRU keyed by `(model, normalized context hash)`; position-aware reuse (cursor moved within the typed-through region); explicit invalidation on document edit outside the completion region. Target: >30% of triggers served without an API call during steady typing.
- [ ] **Request dedup & single-flight**: identical in-flight context → attach, don't re-request.
- [ ] **Speculative/streamed render**: render the first streamed line as soon as it arrives instead of waiting for the full response; extend the ghost text as chunks land.
- [ ] **Acceptance tracking**: full / partial (word/line) / reject signals via `command` on the `InlineCompletionItem` and document-change correlation. This is the input for ranking, personalization, and honest quality metrics.
- [ ] **Local telemetry**: latency histograms (queue, TTFB, total), acceptance rate by language/provider/model, error/rate-limit counts. Stored locally, viewable via `Deeptab: Show Stats`; remote export strictly opt-in.
- [ ] **Retry/failover policy**: classified errors (auth vs rate-limit vs transient), bounded retry with jitter, automatic temporary failover to the next configured provider, circuit breaker with status-bar surfacing.
- [ ] **Latency-tiered providers**: optional "fast first token wins" mode — race a small/fast model against a better/slower one and keep the better result if it arrives before render commit.

**Exit criteria:** p50 time-to-first-visible-character < 250 ms on Groq-class providers; cache hit-rate and acceptance rate visible in stats.

### Phase 3 — Edit-aware intelligence *(mid term)*

From "complete the cursor" to "predict the edit" — the Cursor-Tab differentiator.

- [ ] **IntentTracker v2**: finalized intent events (refactoring vs writing-new vs pasting), rolling edit history per file (last K edits with before/after), session-level "what is the user doing" summary fed to the prompt.
- [ ] **Recent-edits context source**: include a compact diff of the user's last edits in the prompt ("the user just renamed `getUser` → `fetchUser`"), enabling repeated-edit prediction.
- [ ] **Replacement & deletion rendering**: minimal-diff computation between buffer and suggestion; render insertions as ghost text and deletions/replacements via decorations, applied atomically on Tab.
- [ ] **Next-edit prediction v1**: after an accepted edit, predict the next location (e.g., remaining call sites of a renamed symbol) and offer a Tab-jump hint.
- [ ] **LSP context source**: hover types, signature help, and diagnostics at the cursor folded into the prompt; diagnostics enable "fix-forward" completions.
- [ ] **Cross-file context v1**: recently viewed/edited files ranked by recency + import-graph proximity; extract relevant declarations rather than whole files.
- [ ] **Shadow workspace (rebuilt properly)**: validate candidate multi-line edits in a hidden document — apply the edit, collect diagnostics, suppress or repair suggestions that introduce errors. (The deleted `shadowWorkspace.js` experiment gets a real home here, behind a feature flag, with a latency budget.)

**Exit criteria:** repeated-edit scenarios (renames, signature changes) produce correct predicted edits; multi-line suggestions that would introduce diagnostics are filtered.

### Phase 4 — Personalization, policies, resilience *(mid → long term)*

- [ ] **Personalized completion memory**: per-workspace store of accepted/rejected patterns; bias ranking toward the user's demonstrated conventions (naming style, preferred APIs, test framework idioms). Local by default, exportable.
- [ ] **Completion history & recovery**: ring buffer of recent suggestions (shown/accepted/rejected) with a `Deeptab: Completion History` view; re-apply a previously dismissed suggestion; recover a suggestion lost to an edit.
- [ ] **Custom completion policies**: declarative per-workspace rules (`.deeptab/policy.json`): disable in globs (e.g. `**/*.env*`, `secrets/**`), force single-line in some languages, redact matched patterns from outgoing context, max context bytes per request — the compliance story for teams.
- [ ] **Offline / degraded mode**: explicit state machine — full / degraded (cache + continuation only) / offline (local provider or silent). Never error-spam; status bar reflects mode.
- [ ] **Local model support**: Ollama / llama.cpp / LM Studio adapters via the provider registry; enables fully offline operation and the privacy story.
- [ ] **Session-aware behavior**: adapt trigger aggressiveness to the session — back off when the user is rejecting heavily, lean in during high-acceptance flow; respect "focus mode" (suspend N minutes) command.
- [ ] **Command palette & quick actions**: toggle on/off (global / language / workspace), switch provider/model, clear cache, show stats, report-bad-completion (captures context locally for debugging).
- [ ] **Multi-source ranking**: when multiple candidates exist (n>1 sampling, racing providers, cache + fresh), score by model confidence proxy, syntactic validity, buffer-suffix overlap, and personalization priors; show best, cycle with `Alt+]`.

### Phase 5 — Production & ecosystem readiness *(long term)*

- [ ] **Evaluation harness**: offline benchmark of recorded editing sessions replayed against the pipeline; regression-gate prompt/ranking changes on acceptance-proxy metrics. No prompt change ships without an eval run.
- [ ] **Performance engineering**: bundle with esbuild, lazy-activate heavy services, memory caps on caches/history, startup time budget (< 50 ms activation).
- [ ] **Release engineering**: semantic versioning, changelog automation, pre-release channel on the Marketplace, signed packaging, Open VSX publication.
- [ ] **Extensibility API**: stable internal interfaces for context sources, providers, post-processors, and ranking strategies — third parties (or future Deeptab features: rules engines, org-specific context servers, RAG over internal docs) plug in without forking the pipeline.
- [ ] **Team/server mode (exploratory)**: shared context server that indexes a repo once for a whole team; org-level policy distribution; usage dashboards.
- [ ] **Editor portability (exploratory)**: extract `core/`, `context/`, `prompt/`, `postprocess/` into an editor-agnostic package; VS Code becomes one frontend (Neovim/JetBrains feasible later).

---

## Advanced Capabilities Catalog

Reference list of the product-defining features, mapped to roadmap phases:

| Capability | Summary | Phase |
|---|---|---|
| Context-aware completions | Prefix/suffix, imports, LSP types & diagnostics, cross-file symbols | 1, 3 |
| Smart caching & latency optimization | Prefix-keyed LRU, single-flight dedup, streamed first-line render, provider racing | 2 |
| Completion feedback loop | Full/partial/reject tracking driving metrics and ranking | 2 |
| Telemetry / analytics hooks | Local-first stats, opt-in export, pluggable sinks | 2 |
| Safe fallback handling | Error classification, retry/failover, circuit breaker, never-break-typing guarantee | 2 |
| Edit-intent tracking | Classify in-flight edits; feed recent-edit diffs to the model | 3 |
| Next-edit prediction | Predict and jump to the next location of a repeated edit | 3 |
| Shadow workspace | Validate multi-line edits against diagnostics in a hidden document before showing them | 3 |
| Multi-source suggestion ranking | Score candidates from sampling/racing/cache; cycle alternatives | 4 |
| Personalized completion memory | Learn per-workspace conventions from accept/reject history | 4 |
| Completion history & recovery | Browse and re-apply recent suggestions | 4 |
| Custom completion policies | Per-workspace rules: path exclusions, redaction, context limits | 4 |
| Offline / degraded mode | Explicit modes; cache-only and local-model operation | 4 |
| Session-aware behavior | Adaptive trigger aggressiveness; focus mode | 4 |
| Command palette / quick actions | Toggle, switch model, stats, history, report-bad-completion | 4 |
| Evaluation harness | Replay-based offline benchmarks gating prompt/ranking changes | 5 |
| Extensibility for AI/rules engines | Stable plugin points for context sources, providers, rankers | 5 |

## Performance Budgets

Budgets the pipeline is engineered against (enforced via telemetry in Phase 2, eval harness in Phase 5):

| Metric | Budget |
|---|---|
| Keystroke → request dispatched (local overhead) | < 5 ms p50 |
| Time to first visible suggestion character | < 250 ms p50 / < 600 ms p95 (fast providers) |
| Cache-hit render | < 16 ms (one frame) |
| Extension activation | < 50 ms |
| Memory (caches + history + edit log) | < 50 MB steady state |
| Cancelled-request waste | every superseded request aborted within 10 ms |

## Testing Strategy

- **Unit (no extension host):** continuation/divergence matching, SSE parsing against recorded fixtures, token budget math, truncation/dedup/bracket-balancing, trigger policy decisions, cache keying & invalidation. This is why pure logic lives outside `vscode`-importing modules.
- **Integration (`@vscode/test-electron`):** provider registration, settings reactivity, secret storage flows, command behavior, state cleanup across document switches.
- **Contract tests per provider:** recorded SSE streams (happy path, rate-limit, mid-stream disconnect, malformed chunks) replayed against each adapter.
- **Scenario replays (Phase 5):** recorded editing sessions replayed through the full pipeline as regression suites for quality metrics.
- **Soak/leak checks:** long-session memory growth, disposable accounting (every listener registered is disposed — the current `IntentTracker.dispose()` bug is exactly what this catches).

## Observability

- All pipeline stages log to the `Deeptab` output channel with stage tags (`[Provider]`, `[ApiClient]`, …) and per-request correlation IDs (planned).
- Local stats (planned, Phase 2): latency percentiles, acceptance rate, cache hit rate, error counts by provider — surfaced via `Deeptab: Show Stats` and the status bar tooltip.
- **Privacy stance:** no code or telemetry leaves the machine except the completion requests to the provider the user configured. Any remote telemetry is opt-in, documented, and content-free.

---

## Getting Started

1. Install the extension (or run from source — see [Development](#development)).
2. Get an API key from at least one provider:

   | Provider | Keys |
   |---|---|
   | OpenRouter | https://openrouter.ai/keys |
   | Groq | https://console.groq.com/keys |
   | Fireworks | https://fireworks.ai/account/api-keys |

3. Open **Settings** (`Ctrl+,`), search for `Deeptab`, and set the key. Provider priority (first configured wins): OpenRouter → Groq → Fireworks.
4. Open any file and start typing — suggestions appear as ghost text. `Tab` accepts, `Esc` dismisses.

> ⚠️ Keys are currently stored in VS Code settings. Migration to `SecretStorage` is the top Phase 0 item; until then, prefer user-level (not workspace) settings and never commit a workspace `settings.json` containing keys.

## Extension Settings

| Setting | Default | Description |
|---|---|---|
| `deeptab.openrouterApiKey` | `""` | OpenRouter API key |
| `deeptab.openrouterModel` | `poolside/laguna-xs.2:free` | Model for OpenRouter completions |
| `deeptab.groqApiKey` | `""` | Groq API key |
| `deeptab.fireworksApiKey` | `""` | Fireworks API key |
| `deeptab.model` | `qwen/qwen3-32b` | Model for Groq / Fireworks |
| `deeptab.maxTokens` | `2048` | Max tokens per completion |
| `deeptab.temperature` | `0.1` | Sampling temperature *(declared but not yet honored — see gaps)* |

Environment-variable fallbacks: `OPENROUTER_API_KEY`, `GROQ_API_KEY`, `FIREWORKS_API_KEY`.

## Development

```bash
npm install        # install dependencies
npm run watch      # compile in watch mode
# Press F5 in VS Code to launch an Extension Development Host
npm run lint       # eslint
npm test           # extension-host tests via @vscode/test-cli
```

Useful references in-repo:

- [`architecture.md`](./architecture.md) — target pipeline flowchart
- [`pending-completion.md`](./pending-completion.md) — replay/continuation state machine
- [`sequence.md`](./sequence.md) — activation & request sequence diagram

## Contributing

The project is early and contributions are welcome, especially against Phase 0/1 roadmap items.

- Pick an unchecked roadmap item or open an issue describing the change first for anything architectural.
- Keep pure logic out of `vscode`-importing modules so it stays unit-testable.
- Every event listener and disposable must be registered for disposal — no leaks.
- Run `npm run lint && npm test` before submitting.
- Quality changes to prompting or ranking should explain how they were validated (until the eval harness exists, before/after examples in the PR description).

## License

Not yet specified — choosing a license is a Phase 0 housekeeping item.
