/**
 * Pure parser for OpenAI-style Server-Sent Event completion streams.
 *
 * Stateless between calls except for the caller-held `buffer` carrying an
 * incomplete trailing line across chunk boundaries. No I/O, no vscode —
 * unit-testable against recorded fixtures.
 */

interface StreamChunkShape {
  choices?: Array<{
    delta?: {
      content?: string
    }
  }>
}

export interface SSEParseResult {
  /** Content deltas extracted from this chunk, in order. */
  contents: string[]
  /** True when the `[DONE]` sentinel was seen; no further data follows. */
  done: boolean
  /** Raw lines that failed to parse as JSON (skipped, not fatal). */
  errors: string[]
  /** Incomplete trailing line to prepend to the next chunk. */
  buffer: string
}

export function parseSSEChunk(buffer: string, chunk: string): SSEParseResult {
  const result: SSEParseResult = {contents: [], done: false, errors: [], buffer: ''}

  const combined = buffer + chunk
  const lines = combined.split('\n')
  result.buffer = lines.pop() ?? ''

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line.startsWith('data:')) {
      continue
    }
    const data = line.slice(5).trim()
    if (data === '[DONE]') {
      result.done = true
      result.buffer = ''
      return result
    }
    try {
      const parsed = JSON.parse(data) as StreamChunkShape
      const content = parsed.choices?.[0]?.delta?.content
      if (content) {
        result.contents.push(content)
      }
    } catch {
      result.errors.push(rawLine)
    }
  }

  return result
}
