/**
 * Pure, editor-agnostic completion session state.
 *
 * A session represents one suggestion shown to the user: where it was
 * anchored, the document version it was generated against, and how much
 * of it the user has typed through. All functions are pure so the logic
 * is unit-testable without a VS Code extension host.
 *
 * The session is version-aware: any document change that is not the user
 * typing through the suggestion invalidates it, which prevents replaying
 * stale suggestions after formatter runs, git checkouts, or other
 * external edits that land the cursor at the same position.
 */

export interface PlainPosition {
  line: number
  character: number
}

export interface PlainContentChange {
  startLine: number
  startCharacter: number
  /** Number of characters replaced by this change (0 for pure insertion). */
  rangeLength: number
  text: string
}

export interface CompletionSession {
  readonly uri: string
  readonly documentVersion: number
  /** Position the suggestion was generated at. */
  readonly anchor: PlainPosition
  /** Full suggestion text. */
  readonly text: string
  /** How many characters of the suggestion the user has typed through. */
  readonly typedLength: number
}

export function createSession(
  uri: string,
  documentVersion: number,
  anchor: PlainPosition,
  text: string,
): CompletionSession {
  return {uri, documentVersion, anchor, text, typedLength: 0}
}

/** The cursor position expected after `typedLength` accepted characters. */
export function expectedCursor(session: CompletionSession): PlainPosition {
  return {
    line: session.anchor.line,
    character: session.anchor.character + session.typedLength,
  }
}

/**
 * Advance the session through a document change event.
 *
 * Returns the updated session when every change in the event is the user
 * typing the next characters of the suggestion at the expected cursor.
 * Returns null when the session is invalidated (external edit, divergent
 * typing, deletion) or fully consumed.
 *
 * Changes to unrelated documents leave the session untouched.
 */
export function applyDocumentChange(
  session: CompletionSession | null,
  uri: string,
  newVersion: number,
  changes: readonly PlainContentChange[],
): CompletionSession | null {
  if (!session) {
    return null
  }
  if (uri !== session.uri) {
    return session
  }

  let current = session
  for (const change of changes) {
    const cursor = expectedCursor(current)
    const isTypingThrough =
      change.rangeLength === 0 &&
      change.startLine === cursor.line &&
      change.startCharacter === cursor.character &&
      change.text.length > 0 &&
      !change.text.includes('\n') &&
      current.text.startsWith(change.text, current.typedLength)

    if (!isTypingThrough) {
      return null
    }

    const typedLength = current.typedLength + change.text.length
    if (typedLength >= current.text.length) {
      // Suggestion fully consumed; nothing left to show.
      return null
    }
    current = {...current, typedLength, documentVersion: newVersion}
  }

  return {...current, documentVersion: newVersion}
}

/**
 * Text still to be suggested at the given location, or null when the
 * session does not apply (different document, stale version, cursor not
 * at the expected position, or nothing remaining).
 */
export function getRemainingText(
  session: CompletionSession | null,
  uri: string,
  documentVersion: number,
  position: PlainPosition,
): string | null {
  if (!session || session.uri !== uri || session.documentVersion !== documentVersion) {
    return null
  }
  const cursor = expectedCursor(session)
  if (position.line !== cursor.line || position.character !== cursor.character) {
    return null
  }
  const remaining = session.text.slice(session.typedLength)
  return remaining || null
}
