import * as vscode from 'vscode'
import {ApiClient} from '../api/apiClient'
import {ChatMessage} from '../utils/types'
import {
  CompletionSession,
  PlainContentChange,
  applyDocumentChange,
  createSession,
  getRemainingText,
} from '../core/completionSession'

/**
 * Inline completion provider for DeepTab.
 *
 * Collects the current editing context, generates AI-powered completion
 * suggestions, and returns them as VS Code inline completion items.
 *
 * Suggestion state lives in a single version-aware {@link CompletionSession}:
 * document change events advance it while the user types through the
 * suggestion and invalidate it on any external edit (formatter, git
 * checkout, multi-cursor edits), so a stale suggestion is never replayed.
 */
export class InlineCompletionProvider
  implements vscode.InlineCompletionItemProvider, vscode.Disposable
{
  private readonly outputChannel: vscode.OutputChannel
  private readonly apiClient: ApiClient
  private readonly disposables: vscode.Disposable[] = []
  private session: CompletionSession | null = null

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel
    this.apiClient = new ApiClient(outputChannel)
    this.registerSessionInvalidation()
  }

  private registerSessionInvalidation(): void {
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const before = this.session
        this.session = applyDocumentChange(
          this.session,
          event.document.uri.toString(),
          event.document.version,
          event.contentChanges.map(toPlainChange),
        )
        if (before && !this.session) {
          this.log('Session invalidated by document change')
        }
      }),
      vscode.window.onDidChangeActiveTextEditor((editor) => {
        if (this.session && editor?.document.uri.toString() !== this.session.uri) {
          this.session = null
          this.log('Session invalidated by editor switch')
        }
      }),
      vscode.workspace.onDidCloseTextDocument((document) => {
        if (this.session && document.uri.toString() === this.session.uri) {
          this.session = null
          this.log('Session invalidated by document close')
        }
      }),
    )
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.InlineCompletionList | null> {
    try {
      this.log(`provideInlineCompletionItems called at ${position.line}:${position.character}`)

      /* Stage 1: Serve the active session (replay at anchor or continue
         after the user typed part of the suggestion) without an API call. */
      const remaining = getRemainingText(
        this.session,
        document.uri.toString(),
        document.version,
        {line: position.line, character: position.character},
      )
      if (remaining !== null) {
        this.log(`Serving remaining session text: "${remaining}"`)
        return this.createInlineCompletionList(remaining)
      }
      if (this.session) {
        // Session exists but does not apply at this location — drop it.
        this.session = null
      }

      /* Stage 2: Cache */

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
        return {items: []}
      }

      this.session = createSession(
        document.uri.toString(),
        document.version,
        {line: position.line, character: position.character},
        completion,
      )

      return this.createInlineCompletionList(completion)
    } catch (error) {
      this.log(`Unexpected error: ${error}`)
      return null
    }
  }

  private createInlineCompletionList(text: string): vscode.InlineCompletionList {
    const item = new vscode.InlineCompletionItem(text)
    return new vscode.InlineCompletionList([item])
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

  dispose(): void {
    this.disposables.forEach((d) => d.dispose())
    this.disposables.length = 0
    this.session = null
    this.apiClient.dispose()
  }
}

function toPlainChange(change: vscode.TextDocumentContentChangeEvent): PlainContentChange {
  return {
    startLine: change.range.start.line,
    startCharacter: change.range.start.character,
    rangeLength: change.rangeLength,
    text: change.text,
  }
}
