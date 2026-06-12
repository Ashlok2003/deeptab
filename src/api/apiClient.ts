import * as vscode from 'vscode'
import {getConfig} from '../services/configurationService'
import {ChatMessage} from '../utils/types'
import {parseSSEChunk} from '../core/sse'
import {ApiProvider, selectProvider} from '../core/providerSelection'

export type {ApiProvider} from '../core/providerSelection'

interface ProviderConfig {
  endpoint: string
  getApiKey: () => string
  getModel: () => string
}

const PROVIDER_CONFIGS: Record<ApiProvider, ProviderConfig> = {
  openrouter: {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    getApiKey: () => getConfig().openRouterApiKey,
    getModel: () => getConfig().openrouterModel,
  },
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    getApiKey: () => getConfig().groqApiKey,
    getModel: () => getConfig().model,
  },
  fireworks: {
    endpoint: 'https://api.fireworks.ai/inference/v1/chat/completions',
    getApiKey: () => getConfig().fireworksApiKey,
    getModel: () => getConfig().model,
  },
}

/**
Handles communication with supported LLM providers (OpenRouter, Groq, and Fireworks).

Responsible for:
- Managing provider-specific configuration
- Sending authenticated API requests
- Processing Server-Sent Event (SSE) streaming responses
- Yielding generated text chunks incrementally
- Handling request cancellation and error propagation

This class abstracts provider implementation details behind a common
streaming interface, allowing consumers to switch providers without
changing request or response handling logic.
*/
export class ApiClient implements vscode.Disposable {
  private readonly outputChannel: vscode.OutputChannel
  private pendingRequest: AbortController | null = null

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel
  }

  getActiveProvider(): ApiProvider | null {
    const config = getConfig()
    return selectProvider({
      openrouter: config.openRouterApiKey,
      groq: config.groqApiKey,
      fireworks: config.fireworksApiKey,
    })
  }

  async complete(
    messages: ChatMessage[],
    options: {
      maxTokens?: number
    } = {},
  ): Promise<AsyncGenerator<string, void, unknown>> {
    const provider = this.getActiveProvider()
    if (!provider) {
      throw new Error('No API provider configured')
    }

    this.cancel()
    this.pendingRequest = new AbortController()

    const configService = getConfig()
    const maxTokens = options.maxTokens || configService.maxTokens

    const providerConfig = PROVIDER_CONFIGS[provider]
    const body = {
      model: providerConfig.getModel(),
      messages,
      max_tokens: maxTokens,
      stream: true,
      temperature: configService.temperature,
    }

    this.log(
      `[${provider}] Request: model=${body.model}, max_tokens=${body.max_tokens}, temperature=${body.temperature}`,
    )
    return this.streamRequest(
      providerConfig.endpoint,
      body,
      providerConfig.getApiKey(),
      this.pendingRequest.signal,
    )
  }

  cancel(): void {
    if (this.pendingRequest) {
      this.pendingRequest.abort()
      this.pendingRequest = null
    }
  }

  private async *streamRequest(
    endpoint: string,
    body: Record<string, unknown>,
    apiKey: string,
    signal: AbortSignal,
  ): AsyncGenerator<string, void, unknown> {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API request failed: ${response.status} - ${errorText}`)
    }

    if (!response.body) {
      throw new Error('No response body')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const {done, value} = await reader.read()

        // On EOF, flush the decoder and force-parse any unterminated final
        // line so the last fragment is never dropped.
        const chunk = done
          ? decoder.decode() + '\n'
          : decoder.decode(value, {stream: true})

        const parsed = parseSSEChunk(buffer, chunk)
        buffer = parsed.buffer

        for (const error of parsed.errors) {
          this.log(`Error parsing chunk: ${error}`)
        }
        for (const content of parsed.contents) {
          yield content
        }
        if (parsed.done || done) {
          return
        }
      }
    } catch (error) {
      throw new Error(`Error reading stream: ${error}`)
    } finally {
      reader.releaseLock()
    }
  }

  private log(message: string) {
    this.outputChannel.appendLine(`[ApiClient] ${message}`)
  }

  dispose() {
    this.cancel()
  }
}
