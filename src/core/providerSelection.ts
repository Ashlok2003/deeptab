/**
 * Pure provider selection: first configured key wins.
 * Priority: OpenRouter → Groq → Fireworks.
 */

export type ApiProvider = 'openrouter' | 'groq' | 'fireworks'

export interface ProviderKeys {
  openrouter: string
  groq: string
  fireworks: string
}

const PRIORITY: ApiProvider[] = ['openrouter', 'groq', 'fireworks']

export function selectProvider(keys: ProviderKeys): ApiProvider | null {
  for (const provider of PRIORITY) {
    if (keys[provider]?.trim()) {
      return provider
    }
  }
  return null
}
