# Migrate API keys to VS Code SecretStorage

| Priority | Estimate | Labels | Depends on |
|---|---|---|---|
| P0 | M | phase-0, area:security | — |

## Problem

API keys currently live in plain VS Code settings (`deeptab.openrouterApiKey` etc.) and a local `.env`. Settings are sync-able and stored as plaintext JSON; this is a credential-leak risk and blocks any public release.

## Tasks

- [ ] Create `src/services/secretService.ts` wrapping `context.secrets` (VS Code `SecretStorage`): `getKey(provider)`, `setKey(provider, value)`, `deleteKey(provider)`, `onDidChange`.
- [ ] Add command `Deeptab: Set API Key` — quick-pick provider → password-masked input box → store in SecretStorage.
- [ ] Add command `Deeptab: Clear API Key`.
- [ ] Migration: on activation, if a key exists in settings, move it into SecretStorage, clear the setting value, and notify the user once.
- [ ] Update `ApiClient.getActiveProvider()` and `PROVIDER_CONFIGS` to read keys via `SecretService` (async — provider selection becomes async).
- [ ] Keep env-var fallback (`OPENROUTER_API_KEY` etc.) for development only; exclude `.env` from packaged builds via `.vscodeignore`.
- [ ] Mark the settings-based key properties deprecated in `package.json` (`markdownDeprecationMessage`), remove them entirely in a later release.

## Acceptance criteria

- No code path writes an API key to `settings.json`.
- Fresh install: `Deeptab: Set API Key` is sufficient to get completions working.
- Existing users with keys in settings are migrated automatically and keys removed from settings.
- Keys never appear in the output channel or error messages.

## Out of scope

- OAuth flows; per-workspace keys.

## Code references

- `src/api/apiClient.ts` — `PROVIDER_CONFIGS`, `getActiveProvider()`
- `src/services/configurationService.ts` — `DEFAULTS` env fallbacks
- `package.json` — `contributes.configuration`
