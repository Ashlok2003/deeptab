import * as vscode from 'vscode'

export interface TabCompletionConfig {
  /* API Keys */
  fireworksApiKey: string
  groqApiKey: string
  openRouterApiKey: string

  /* Modal Settings */
  model: string
  openrouterModel: string
  maxTokens: number

  /* Cache Settings */
}

const DEFAULTS: TabCompletionConfig = {
  fireworksApiKey: process.env.FIREWORKS_API_KEY || '',
  groqApiKey: process.env.GROQ_API_KEY || '',
  openRouterApiKey: process.env.OPENROUTER_API_KEY || '',
  model: 'qwen/qwen3-32b',
  openrouterModel: 'poolside/laguna-xs.2:free',
  maxTokens: 2048,
}

/**
 * Centralized configuration manager for DeepTab.
 *
 * Responsibilities:
 * - Loading extension settings from the VS Code workspace configuration
 * - Providing strongly typed access to configuration values
 * - Maintaining an in-memory configuration cache
 * - Monitoring configuration changes and notifying subscribers
 * - Exposing a singleton instance to ensure a single source of truth
 *
 * This service abstracts VS Code's configuration APIs and provides a
 * reactive interface for components that depend on runtime settings
 * such as API keys, model selection, and generation parameters.
 */
export class ConfigurationService implements vscode.Disposable {
  private static instance: ConfigurationService | null = null
  private cachedConfig: TabCompletionConfig
  private readonly disposables: vscode.Disposable[] = []
  private readonly changeListeners: Set<(config: TabCompletionConfig) => void> = new Set()

  private constructor() {
    this.cachedConfig = this.loadConfig()
    this.registerConfigChangeListener()
  }

  static getInstance(): ConfigurationService {
    if (!ConfigurationService.instance) {
      ConfigurationService.instance = new ConfigurationService()
    }
    return ConfigurationService.instance
  }

  private registerConfigChangeListener() {
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('deeptab')) {
          this.cachedConfig = this.loadConfig()
          this.notifyListeners()
        }
      }),
    )
  }

  private loadConfig(): TabCompletionConfig {
    const config = vscode.workspace.getConfiguration('deeptab')
    return {
      fireworksApiKey: config.get<string>('fireworksApiKey', DEFAULTS.fireworksApiKey) || '',
      groqApiKey: config.get<string>('groqApiKey', DEFAULTS.groqApiKey) || '',
      openRouterApiKey:
        config.get<string>('openrouterApiKey', '') ||
        config.get<string>('openRouterApiKey', DEFAULTS.openRouterApiKey) ||
        '',
      model: config.get<string>('model', DEFAULTS.model) || '',
      openrouterModel: config.get<string>('openrouterModel', DEFAULTS.openrouterModel) || '',
      maxTokens: config.get<number>('maxTokens', DEFAULTS.maxTokens) || 2048,
    }
  }

  private notifyListeners() {
    for (const listener of this.changeListeners) {
      try {
        listener(this.cachedConfig)
      } catch (error) {
        // Ignore errors in listeners to prevent cascading failures
      }
    }
  }

  get model(): string {
    return this.cachedConfig.model
  }

  get openRouterApiKey(): string {
    return this.cachedConfig.openRouterApiKey
  }

  get openrouterModel(): string {
    return this.cachedConfig.openrouterModel
  }

  get fireworksApiKey(): string {
    return this.cachedConfig.fireworksApiKey
  }

  get groqApiKey(): string {
    return this.cachedConfig.groqApiKey
  }

  get maxTokens(): number {
    return this.cachedConfig.maxTokens
  }

  onConfigChange(callback: (config: TabCompletionConfig) => void): vscode.Disposable {
    this.changeListeners.add(callback)
    return {
      dispose: () => this.changeListeners.delete(callback),
    }
  }

  dispose() {
    this.disposables.forEach((d) => d.dispose())
    this.changeListeners.clear()
  }
}

export function getConfig(): ConfigurationService {
  return ConfigurationService.getInstance()
}
