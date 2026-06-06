import * as vscode from 'vscode'

export interface ChatStreamChunk {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    delta: {
      content?: string
      role?: string
    }
    index: number
    finish_reason: string | null
  }>
}
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ReplacementEdit {
  insertText: string
  startPosition: vscode.Position
}

export interface PendingCompletion {
  documentUri: string
  edit: ReplacementEdit
}
