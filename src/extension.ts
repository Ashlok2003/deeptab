// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode'
import {InlineCompletionProvider} from './providers/inlineCompletionProvider'

let provider: InlineCompletionProvider | undefined
let outputChannel: vscode.OutputChannel | undefined

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  outputChannel = vscode.window.createOutputChannel('Deeptab')
  outputChannel.appendLine('Deeptab extension activated')

  provider = new InlineCompletionProvider(outputChannel)

  const providerDisposable = vscode.languages.registerInlineCompletionItemProvider(
    {pattern: '**'},
    provider,
  )

  context.subscriptions.push(providerDisposable, provider, outputChannel)
}

// This method is called when your extension is deactivated
export function deactivate() {}
