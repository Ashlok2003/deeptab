import * as assert from 'assert'
import {
  CompletionSession,
  applyDocumentChange,
  createSession,
  expectedCursor,
  getRemainingText,
} from '../../core/completionSession'

const URI = 'file:///project/a.ts'
const OTHER_URI = 'file:///project/b.ts'

function session(overrides: Partial<CompletionSession> = {}): CompletionSession {
  return {
    uri: URI,
    documentVersion: 10,
    anchor: {line: 5, character: 8},
    text: 'console.log(value)',
    typedLength: 0,
    ...overrides,
  }
}

function typing(line: number, character: number, text: string) {
  return [{startLine: line, startCharacter: character, rangeLength: 0, text}]
}

describe('createSession', () => {
  it('starts with nothing typed through', () => {
    const s = createSession(URI, 3, {line: 1, character: 2}, 'abc')
    assert.deepStrictEqual(s, {
      uri: URI,
      documentVersion: 3,
      anchor: {line: 1, character: 2},
      text: 'abc',
      typedLength: 0,
    })
  })
})

describe('expectedCursor', () => {
  it('advances by typedLength on the anchor line', () => {
    assert.deepStrictEqual(expectedCursor(session({typedLength: 4})), {line: 5, character: 12})
  })
})

describe('applyDocumentChange', () => {
  it('returns null for a null session', () => {
    assert.strictEqual(applyDocumentChange(null, URI, 11, typing(5, 8, 'c')), null)
  })

  it('ignores changes in unrelated documents', () => {
    const s = session()
    assert.strictEqual(applyDocumentChange(s, OTHER_URI, 99, typing(0, 0, 'x')), s)
  })

  it('advances typedLength when the user types the next suggestion character', () => {
    const next = applyDocumentChange(session(), URI, 11, typing(5, 8, 'c'))
    assert.deepStrictEqual(next, session({typedLength: 1, documentVersion: 11}))
  })

  it('advances through a multi-character matching insertion', () => {
    const next = applyDocumentChange(session(), URI, 11, typing(5, 8, 'console.'))
    assert.deepStrictEqual(next, session({typedLength: 8, documentVersion: 11}))
  })

  it('invalidates on divergent typing', () => {
    assert.strictEqual(applyDocumentChange(session(), URI, 11, typing(5, 8, 'x')), null)
  })

  it('invalidates on typing at a different position', () => {
    assert.strictEqual(applyDocumentChange(session(), URI, 11, typing(5, 9, 'c')), null)
    assert.strictEqual(applyDocumentChange(session(), URI, 11, typing(6, 8, 'c')), null)
  })

  it('invalidates on deletion or replacement', () => {
    const deletion = [{startLine: 5, startCharacter: 8, rangeLength: 3, text: ''}]
    assert.strictEqual(applyDocumentChange(session(), URI, 11, deletion), null)
    const replacement = [{startLine: 5, startCharacter: 8, rangeLength: 1, text: 'c'}]
    assert.strictEqual(applyDocumentChange(session(), URI, 11, replacement), null)
  })

  it('invalidates on newline insertion even when the suggestion continues', () => {
    const s = session({text: 'foo\nbar'})
    const next = applyDocumentChange(s, URI, 11, typing(5, 8, 'foo'))
    assert.deepStrictEqual(next, {...s, typedLength: 3, documentVersion: 11})
    assert.strictEqual(applyDocumentChange(next, URI, 12, typing(5, 11, '\n')), null)
  })

  it('invalidates external multi-cursor edits where any change diverges', () => {
    const changes = [
      {startLine: 5, startCharacter: 8, rangeLength: 0, text: 'c'},
      {startLine: 20, startCharacter: 0, rangeLength: 0, text: 'c'},
    ]
    assert.strictEqual(applyDocumentChange(session(), URI, 11, changes), null)
  })

  it('returns null when the suggestion is fully consumed', () => {
    const s = session({text: 'ab'})
    assert.strictEqual(applyDocumentChange(s, URI, 11, typing(5, 8, 'ab')), null)
  })

  it('accumulates typedLength across sequential change events', () => {
    let s: CompletionSession | null = session()
    s = applyDocumentChange(s, URI, 11, typing(5, 8, 'con'))
    s = applyDocumentChange(s, URI, 12, typing(5, 11, 'sole'))
    assert.deepStrictEqual(s, session({typedLength: 7, documentVersion: 12}))
  })
})

describe('getRemainingText', () => {
  it('returns the full text at the anchor with matching version', () => {
    const remaining = getRemainingText(session(), URI, 10, {line: 5, character: 8})
    assert.strictEqual(remaining, 'console.log(value)')
  })

  it('returns the remaining suffix after typing through part of the suggestion', () => {
    const s = session({typedLength: 8, documentVersion: 12})
    const remaining = getRemainingText(s, URI, 12, {line: 5, character: 16})
    assert.strictEqual(remaining, 'log(value)')
  })

  it('rejects a stale document version (formatter / external edit)', () => {
    assert.strictEqual(getRemainingText(session(), URI, 11, {line: 5, character: 8}), null)
  })

  it('rejects a different document', () => {
    assert.strictEqual(getRemainingText(session(), OTHER_URI, 10, {line: 5, character: 8}), null)
  })

  it('rejects a cursor away from the expected position', () => {
    assert.strictEqual(getRemainingText(session(), URI, 10, {line: 5, character: 9}), null)
    assert.strictEqual(getRemainingText(session(), URI, 10, {line: 6, character: 8}), null)
  })

  it('returns null for a null session', () => {
    assert.strictEqual(getRemainingText(null, URI, 10, {line: 5, character: 8}), null)
  })
})
