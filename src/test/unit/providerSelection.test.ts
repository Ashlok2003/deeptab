import * as assert from 'assert'
import {selectProvider} from '../../core/providerSelection'

describe('selectProvider', () => {
  it('returns null when no keys are configured', () => {
    assert.strictEqual(selectProvider({openrouter: '', groq: '', fireworks: ''}), null)
  })

  it('prefers openrouter over all others', () => {
    assert.strictEqual(selectProvider({openrouter: 'k', groq: 'k', fireworks: 'k'}), 'openrouter')
  })

  it('prefers groq over fireworks when openrouter is absent', () => {
    assert.strictEqual(selectProvider({openrouter: '', groq: 'k', fireworks: 'k'}), 'groq')
  })

  it('falls back to fireworks as last resort', () => {
    assert.strictEqual(selectProvider({openrouter: '', groq: '', fireworks: 'k'}), 'fireworks')
  })
})
