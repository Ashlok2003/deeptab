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
