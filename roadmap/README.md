# Deeptab Roadmap — Issue Backlog

Every file in this folder is a self-contained, GitHub-issue-ready work item. Together they form the complete path from the current prototype to a production-ready, market-competitive tab completion extension.

## How to use (solo workflow)

1. Work phases in order. Inside a phase, respect `Depends on`; otherwise pick freely.
2. When you start an item, raise it as a GitHub issue (copy the file body, or `gh issue create --title "..." --body-file roadmap/phase-0/001-secret-storage.md --label phase-0`).
3. Close the issue only when every acceptance criterion passes.
4. Fine-tune freely — split items that feel too big, merge ones that feel too small. Keep this index in sync.

## Issue format

Each file: header table (priority, estimate, dependencies) → **Problem** → **Tasks** → **Acceptance criteria** → **Out of scope** → **Code references**.

Estimates: `S` = ≤1 day, `M` = 2–4 days, `L` = ~1 week, `XL` = 2+ weeks (consider splitting).

## Phase overview

| Phase | Theme | Exit criteria |
|---|---|---|
| [0](#phase-0--hardening) | Correctness, safety, measurability of existing loop | No known state-machine bugs; no plaintext keys; tests + CI green |
| [1](#phase-1--context-engine--fim) | Real context + FIM prompting — the quality jump | Suggestions reflect surrounding code; FIM path live |
| [2](#phase-2--speed-caching-feedback) | Feel instant; measure everything | p50 first-char < 250 ms; cache hit & acceptance rate visible |
| [3](#phase-3--edit-aware-intelligence) | Predict the edit, not just the cursor | Repeated-edit prediction works; bad multi-line edits filtered |
| [4](#phase-4--personalization-policies-resilience) | Adapt to user; survive failure | Offline mode; policies; local models; ranking |
| [5](#phase-5--production--ecosystem) | Ship and scale | Marketplace release pipeline; eval-gated changes |

## Target architecture

Where the roadmap converges. Each block maps to issues (numbers in brackets). Planned files are referenced throughout the issues even though they don't exist yet — they define the destination structure.

```mermaid
flowchart TD
    K([Keystroke]) --> DB["Debouncer [003]"]
    DB --> TP["Trigger policy [003, 406]"]
    TP -->|suppress| X([No suggestion])
    TP --> EE

    subgraph EE["Early exit"]
        CACHE["Completion cache [201, 202]"]
        REPLAY["Pending replay / continuation [004]"]
    end
    EE -->|hit| RENDER

    EE -->|miss| CE
    subgraph CE["Context engine [103]"]
        BUF["Buffer prefix/suffix [101]"]
        FS["Imports & scope [105]"]
        EH["Recent edits [301, 302]"]
        LSP["LSP types & diagnostics [305]"]
        XF["Cross-file snippets [306]"]
        PERS["Personalization signals [401]"]
    end
    CE --> POLICY["Policy & redaction [403]"]
    POLICY --> PB["Prompt builder + token budget [103]"]
    PB --> PROF["Model profiles: FIM / chat [102]"]
    PROF --> API["ApiClient [206 retry/failover]"]
    API --> P1[(OpenRouter)] & P2[(Groq)] & P3[(Fireworks)] & P4[("Local / Ollama [405]")]
    API -.racing.- RACE["Provider racing [207]"]

    P1 & P2 & P3 & P4 --> PP
    subgraph PP["Post-processing [104]"]
        SAN[sanitize] --> TRUNC[truncate] --> DEDUP[dedup] --> BRACK[bracket balance]
    end
    PP --> RANK["Ranking [408]"]
    RANK --> DIFF["Minimal diff [303]"]
    DIFF --> SHADOW["Shadow validation [307]"]
    SHADOW --> RENDER

    subgraph RENDER["Rendering"]
        GHOST["Ghost text (streamed) [203]"]
        DECO["Deletion decorations [303]"]
        NEP["Next-edit jump hints [304]"]
    end
    RENDER --> OUT["Outcome tracking [204]"]
    OUT --> TEL["Telemetry & stats [205]"]
    OUT --> PERS
    OUT --> HIST["History & recovery [402]"]
    TEL --> EVAL["Eval harness [501]"]

    MODE["Mode manager: full/degraded/offline [404]"] -.governs.- API
    SB["Status bar [006] · Commands [407]"] -.observes.- MODE
```

## Dependency graph

Critical path runs left to right; anything not on an arrow can be picked up independently once its phase opens.

```mermaid
flowchart LR
    subgraph P0["Phase 0"]
        i001[001 secrets]
        i002[002 selector]
        i003[003 debounce/policy]
        i004[004 state correctness]
        i005[005 wire IntentTracker]
        i006[006 status bar]
        i007[007 unit tests]
        i008[008 CI]
        i009[009 housekeeping]
    end
    subgraph P1["Phase 1"]
        i101[101 prefix/suffix]
        i102[102 FIM profiles]
        i103[103 prompt builder]
        i104[104 postprocess]
        i105[105 imports/scope]
        i106[106 multiline]
    end
    subgraph P2["Phase 2"]
        i201[201 cache]
        i202[202 dedup]
        i203[203 streamed render]
        i204[204 acceptance]
        i205[205 telemetry]
        i206[206 retry/failover]
        i207[207 racing]
    end
    subgraph P3["Phase 3"]
        i301[301 intent v2]
        i302[302 recent edits ctx]
        i303[303 diff render]
        i304[304 next-edit]
        i305[305 LSP ctx]
        i306[306 cross-file ctx]
        i307[307 shadow ws]
    end
    subgraph P4["Phase 4"]
        i401[401 personalization]
        i402[402 history]
        i403[403 policies]
        i404[404 offline mode]
        i405[405 local models]
        i406[406 session-aware]
        i407[407 commands]
        i408[408 ranking]
    end
    subgraph P5["Phase 5"]
        i501[501 eval harness]
        i502[502 performance]
        i503[503 release]
        i504[504 extensibility]
        i505[505 team server]
        i506[506 portability]
    end

    i004 --> i007 --> i008 --> i503
    i004 --> i101 --> i102 --> i104 --> i106 --> i303 --> i304
    i101 --> i103
    i103 --> i105 & i305 & i306 & i403
    i101 --> i201 --> i202
    i104 --> i203
    i004 --> i204 --> i205 --> i501
    i204 --> i401 & i402 & i406
    i206 --> i207 --> i408
    i201 & i206 --> i404
    i102 --> i405
    i005 --> i301 --> i302 --> i304
    i103 --> i302
    i006 --> i407
    i401 --> i408 --> i504
    i103 --> i504 --> i505 & i506
    i303 --> i307
```

## Phase 0 — Hardening

| # | Issue | Priority | Est | Depends on |
|---|---|---|---|---|
| 001 | [Migrate API keys to SecretStorage](phase-0/001-secret-storage.md) | P0 | M | — |
| 002 | [Document selector + language enable/disable](phase-0/002-document-selector-language-settings.md) | P0 | S | — |
| 003 | [Debounce + trigger policy v1](phase-0/003-debounce-trigger-policy.md) | P0 | M | — |
| 004 | [Version-aware completion state + honor temperature](phase-0/004-state-correctness.md) | P0 | M | — |
| 005 | [Wire IntentTracker into composition root](phase-0/005-wire-intent-tracker.md) | P1 | S | — |
| 006 | [Status bar item](phase-0/006-status-bar.md) | P1 | S | — |
| 007 | [Unit tests for pure logic](phase-0/007-unit-tests-pure-logic.md) | P0 | M | 004 |
| 008 | [CI pipeline](phase-0/008-ci-pipeline.md) | P0 | S | 007 |
| 009 | [Housekeeping: license, artifacts, .env](phase-0/009-housekeeping.md) | P1 | S | — |

## Phase 1 — Context engine & FIM

| # | Issue | Priority | Est | Depends on |
|---|---|---|---|---|
| 101 | [Prefix/suffix window context](phase-1/101-prefix-suffix-context.md) | P0 | M | 004 |
| 102 | [Model profiles + FIM prompting](phase-1/102-model-profiles-fim.md) | P0 | L | 101 |
| 103 | [Prompt builder + token budget manager](phase-1/103-prompt-builder-token-budget.md) | P0 | M | 101 |
| 104 | [Post-processing v1](phase-1/104-postprocessing-v1.md) | P0 | M | 102 |
| 105 | [Imports & enclosing-scope context](phase-1/105-imports-siblings-context.md) | P1 | M | 103 |
| 106 | [Multi-line completions](phase-1/106-multiline-completions.md) | P1 | M | 104 |

## Phase 2 — Speed, caching, feedback

| # | Issue | Priority | Est | Depends on |
|---|---|---|---|---|
| 201 | [Completion cache](phase-2/201-completion-cache.md) | P0 | L | 101 |
| 202 | [Request dedup / single-flight](phase-2/202-request-dedup.md) | P1 | S | 201 |
| 203 | [Streamed first-line render](phase-2/203-streamed-render.md) | P1 | M | 104 |
| 204 | [Acceptance tracking](phase-2/204-acceptance-tracking.md) | P0 | M | 004 |
| 205 | [Local telemetry & stats](phase-2/205-local-telemetry.md) | P0 | M | 204 |
| 206 | [Retry / failover / circuit breaker](phase-2/206-retry-failover.md) | P0 | M | — |
| 207 | [Provider racing (fast-first-token)](phase-2/207-provider-racing.md) | P2 | M | 206 |

## Phase 3 — Edit-aware intelligence

| # | Issue | Priority | Est | Depends on |
|---|---|---|---|---|
| 301 | [IntentTracker v2: finalized intents + edit history](phase-3/301-intent-tracker-v2.md) | P0 | L | 005 |
| 302 | [Recent-edits context source](phase-3/302-recent-edits-context.md) | P0 | M | 301, 103 |
| 303 | [Replacement & deletion rendering](phase-3/303-diff-rendering.md) | P0 | L | 106 |
| 304 | [Next-edit prediction v1](phase-3/304-next-edit-prediction.md) | P1 | XL | 302, 303 |
| 305 | [LSP context source](phase-3/305-lsp-context.md) | P1 | M | 103 |
| 306 | [Cross-file context v1](phase-3/306-cross-file-context.md) | P1 | L | 103 |
| 307 | [Shadow workspace validation](phase-3/307-shadow-workspace.md) | P2 | L | 303 |

## Phase 4 — Personalization, policies, resilience

| # | Issue | Priority | Est | Depends on |
|---|---|---|---|---|
| 401 | [Personalized completion memory](phase-4/401-personalized-memory.md) | P1 | L | 204 |
| 402 | [Completion history & recovery](phase-4/402-completion-history.md) | P2 | M | 204 |
| 403 | [Custom completion policies](phase-4/403-custom-policies.md) | P1 | M | 103 |
| 404 | [Offline / degraded mode](phase-4/404-offline-degraded-mode.md) | P1 | M | 201, 206 |
| 405 | [Local model support (Ollama / llama.cpp)](phase-4/405-local-models.md) | P1 | M | 102 |
| 406 | [Session-aware trigger behavior](phase-4/406-session-aware-behavior.md) | P2 | M | 204 |
| 407 | [Command palette & quick actions](phase-4/407-commands-quick-actions.md) | P1 | S | 006 |
| 408 | [Multi-source suggestion ranking](phase-4/408-multi-source-ranking.md) | P2 | L | 207, 401 |

## Phase 5 — Production & ecosystem

| # | Issue | Priority | Est | Depends on |
|---|---|---|---|---|
| 501 | [Evaluation harness](phase-5/501-eval-harness.md) | P0 | XL | 205 |
| 502 | [Performance: bundling, lazy activation, memory caps](phase-5/502-performance-engineering.md) | P0 | M | — |
| 503 | [Release engineering](phase-5/503-release-engineering.md) | P0 | M | 008 |
| 504 | [Extensibility API](phase-5/504-extensibility-api.md) | P1 | L | 103, 408 |
| 505 | [Team / server mode (exploratory)](phase-5/505-team-server-mode.md) | P3 | XL | 504 |
| 506 | [Editor portability (exploratory)](phase-5/506-editor-portability.md) | P3 | XL | 504 |

## Suggested labels

`phase-0` … `phase-5`, `P0`–`P3`, `area:context`, `area:provider`, `area:cache`, `area:ui`, `area:testing`, `area:security`, `exploratory`.
