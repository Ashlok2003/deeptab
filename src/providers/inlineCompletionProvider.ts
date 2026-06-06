import * as vscode from 'vscode'
import {ApiClient} from '../api/apiClient'
import {ChatMessage, PendingCompletion, ReplacementEdit} from '../utils/types'

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
  private pendingCompletion: PendingCompletion | null = null
  private lastCompletionText = ''
  private lastCompletionPosition: vscode.Position | null = null
  private lastCompletionUri: string | null = null

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
      this.log(`provideInlineCompletionItems called at ${position.line}:${position.character}`)
      /* Stage 1: Check for existing pending completion */
      const pendingCompletionResult = this.handleExistingPendingCompletion(document, position)

      if (pendingCompletionResult !== undefined) {
        return pendingCompletionResult
      }
      /* Stage 2: Cache */

      /* Stage 3: Try to continue the previous prediction */
      const continueResult = this.tryContinuePrediction(document, position)
      if (continueResult !== undefined) {
        return continueResult
      }

      const prefix = document.getText(
        new vscode.Range(new vscode.Position(position.line, 0), position),
      )

      if (token.isCancellationRequested) {
        this.log('Completion request cancelled before API call')
        return null
      }

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

      if (!completion || !completion.trim()) {
        return Promise.resolve({items: []})
      }

      const edit: ReplacementEdit = {
        insertText: completion,
        startPosition: position,
      }

      return this.activateCompletion(edit, document)
    } catch (error) {
      this.log(`Unexpected error: ${error}`)
      return null
    }
  }

  private activateCompletion(
    edit: ReplacementEdit,
    document: vscode.TextDocument,
  ): vscode.InlineCompletionList | null {
    this.lastCompletionText = edit.insertText
    this.lastCompletionPosition = edit.startPosition
    this.lastCompletionUri = document.uri.toString()

    this.pendingCompletion = {
      documentUri: document.uri.toString(),
      edit,
    }

    return this.createInlineCompletionList(edit.insertText)
  }

  private tryContinuePrediction(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.InlineCompletionList | null | undefined {
    if (
      !this.lastCompletionText ||
      !this.lastCompletionPosition ||
      !this.lastCompletionUri
    ) {
      return undefined
    }

    const charsSinceCompletion = position.character - this.lastCompletionPosition.character
    if (position.line !== this.lastCompletionPosition.line || charsSinceCompletion <= 0) {
      return undefined
    }

    const typedText = document.getText(new vscode.Range(this.lastCompletionPosition, position))

    if (
      charsSinceCompletion <= this.lastCompletionText.length &&
      this.lastCompletionText.startsWith(typedText)
    ) {
      const remaining = this.lastCompletionText.slice(typedText.length)
      if (remaining) {
        this.log(`Continuing prediction with remaining text: "${remaining}"`)
        return this.createInlineCompletionList(remaining, new vscode.Range(position, position))
      }
      this.log('User has typed the entire completion text')
      this.lastCompletionText = ''
      this.lastCompletionPosition = null
      return null
    }

    this.log(
      `Divergence detected: expected ${this.lastCompletionText}, but user typed "${typedText}"`,
    )
    this.lastCompletionText = ''
    this.lastCompletionPosition = null
    this.clearPendingCompletion()
    return undefined
  }

  private createInlineCompletionList(
    text: string,
    range?: vscode.Range,
  ): vscode.InlineCompletionList {
    const item = new vscode.InlineCompletionItem(text, range)
    return new vscode.InlineCompletionList([item])
  }

  private handleExistingPendingCompletion(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.InlineCompletionList | null | undefined {
    if (!this.pendingCompletion) {
      return undefined
    }

    const pendingPosition = this.pendingCompletion.edit.startPosition
    const pendingUri = this.pendingCompletion.documentUri

    if (document.uri.toString() !== pendingUri) {
      this.clearPendingCompletion()
      return undefined
    }

    if (position.line !== pendingPosition.line) {
      this.clearPendingCompletion()
      return undefined
    }

    if (position.character === pendingPosition.character) {
      return this.createInlineCompletionList(this.pendingCompletion.edit.insertText)
    }

    this.clearPendingCompletion()
    return undefined
  }

  private clearPendingCompletion(): void {
    this.pendingCompletion = null
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
