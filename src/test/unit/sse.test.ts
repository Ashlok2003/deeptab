import * as assert from 'assert'
import {parseSSEChunk} from '../../core/sse'

function event(content: string): string {
  return `data: ${JSON.stringify({choices: [{delta: {content}, index: 0, finish_reason: null}]})}\n`
}

describe('parseSSEChunk', () => {
  it('extracts content from a single complete event', () => {
    const result = parseSSEChunk('', event('hello'))
    assert.deepStrictEqual(result.contents, ['hello'])
    assert.strictEqual(result.done, false)
    assert.deepStrictEqual(result.errors, [])
    assert.strictEqual(result.buffer, '')
  })

  it('extracts multiple events from one chunk', () => {
    const result = parseSSEChunk('', event('a') + event('b') + event('c'))
    assert.deepStrictEqual(result.contents, ['a', 'b', 'c'])
  })

  it('carries an incomplete trailing line in the buffer', () => {
    const full = event('hello')
    const first = parseSSEChunk('', full.slice(0, 12))
    assert.deepStrictEqual(first.contents, [])
    assert.strictEqual(first.buffer, full.slice(0, 12))

    const second = parseSSEChunk(first.buffer, full.slice(12))
    assert.deepStrictEqual(second.contents, ['hello'])
    assert.strictEqual(second.buffer, '')
  })

  it('signals done on the [DONE] sentinel and stops processing', () => {
    const result = parseSSEChunk('', event('last') + 'data: [DONE]\n' + event('ignored'))
    assert.deepStrictEqual(result.contents, ['last'])
    assert.strictEqual(result.done, true)
    assert.strictEqual(result.buffer, '')
  })

  it('skips malformed JSON lines without dropping the rest', () => {
    const result = parseSSEChunk('', 'data: {not-json\n' + event('ok'))
    assert.deepStrictEqual(result.contents, ['ok'])
    assert.strictEqual(result.errors.length, 1)
    assert.match(result.errors[0], /not-json/)
  })

  it('ignores empty deltas and role-only deltas', () => {
    const roleOnly = `data: ${JSON.stringify({choices: [{delta: {role: 'assistant'}, index: 0, finish_reason: null}]})}\n`
    const emptyContent = event('')
    const result = parseSSEChunk('', roleOnly + emptyContent + event('x'))
    assert.deepStrictEqual(result.contents, ['x'])
    assert.deepStrictEqual(result.errors, [])
  })

  it('ignores non-data lines (comments, blank keep-alives)', () => {
    const result = parseSSEChunk('', ': keep-alive\n\n' + event('x') + '\n')
    assert.deepStrictEqual(result.contents, ['x'])
    assert.deepStrictEqual(result.errors, [])
  })

  it('handles events with no choices array', () => {
    const result = parseSSEChunk('', 'data: {"id":"1","object":"chat.completion.chunk"}\n')
    assert.deepStrictEqual(result.contents, [])
    assert.deepStrictEqual(result.errors, [])
  })
})
