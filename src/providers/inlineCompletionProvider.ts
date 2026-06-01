import * as vscode from 'vscode'
import {ApiClient} from '../api/apiClient'
import {ChatMessage} from '../utils/types'

/**
 * Inline completion provider for DeepTab.
 *
 * Collects the current editing context, generates AI-powered completion
 * suggestions, and returns them as VS Code inline completion items.
 * The provider also emits diagnostic logs to the configured output
 * channel to assist with debugging and performance monitoring.
 */
export class InlineCompletionProvider implements vscode.InlineCompletionItemProvider {
  private readonly outputChannel: vscode.OutputChannel
  private readonly apiClient: ApiClient

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel
    this.apiClient = new ApiClient(outputChannel)
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlineCompletionList | null> {
    try {
      const prefix = document.getText(
        new vscode.Range(new vscode.Position(position.line, 0), position),
      )
      this.log(`provideInlineCompletionItems called at ${position.line}:${position.character}`)

      let completion = ''
      try {
        completion = await this.callCompletionApi(
          [
            {
              role: 'system',
              content:
                'You are an AI assistant that helps with code completion. Provide only the next few characters of the completion without any explanations.',
            },
            {role: 'user', content: prefix},
          ],
          token,
        )
      } catch (error) {
        this.log(`Error during completion: ${error}`)
        return null
      }

      const newItem = new vscode.InlineCompletionItem(completion)
      return Promise.resolve({
        items: [newItem],
      })
    } catch (error) {
      this.log(`Unexpected error: ${error}`)
      return null
    }
  }

  private async callCompletionApi(
    messages: ChatMessage[],
    token: vscode.CancellationToken,
  ): Promise<string> {
    let completion = ''

    try {
      const generator = await this.apiClient.complete(messages)

      let result = ''

      for await (const chunk of generator) {
        if (token.isCancellationRequested) {
          this.apiClient.cancel()
          break
        }
        result += chunk
      }

      completion = result
    } catch (error) {
      this.log(`Error during completion: ${error}`)
    }

    return completion || ''
  }

  private log(message: string) {
    this.outputChannel.appendLine(`[Provider] ${message}`)
  }
}
