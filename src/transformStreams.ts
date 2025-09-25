import * as htmlEntities from 'html-entities'
import { type HTMLToken } from './htmlToken.js'
import type { TagName } from './tagName.js'
import { isVoidElementTagName } from './voidElements.js'

export class TextCapturingTransformStream extends TransformStream<
  string | HTMLToken,
  HTMLToken
> {
  constructor() {
    super({
      transform: (chunk, controller) => {
        // Omit empty text chunks.
        if (chunk !== '') {
          controller.enqueue(
            typeof chunk === 'string' ? { kind: 'text', text: chunk } : chunk,
          )
        }
      },
    })
  }
}

export class HTMLSerializingTransformStream extends TransformStream<
  HTMLToken,
  SerializedHTMLFragment
> {
  // In a valid stream this will be overwritten before it's used, but we need
  // some initial value.
  #lastSeenTagName: TagName = 'html'
  constructor() {
    super({
      transform: (chunk, controller) => {
        if (chunk.kind === 'startOfOpeningTag') {
          this.#lastSeenTagName = chunk.tagName
        }
        const htmlFragment = htmlTokenToHTMLFragment(
          chunk,
          this.#lastSeenTagName,
        )
        if (htmlFragment !== '') {
          controller.enqueue(htmlFragment)
        }
      },
    })
  }
}

declare const _isSerializedHTMLFragment: unique symbol
export type SerializedHTMLFragment = string & {
  readonly [_isSerializedHTMLFragment]: true
}

const htmlTokenToHTMLFragment = (
  chunk: HTMLToken,
  lastTagName: TagName,
): SerializedHTMLFragment => {
  switch (chunk.kind) {
    case 'text':
      return escapeHTMLContent(chunk.text)
    case 'startOfOpeningTag':
      lastTagName = chunk.tagName
      return '<'.concat(chunk.tagName) as SerializedHTMLFragment
    case 'attribute':
      return (
        chunk.value === ''
          ? ' '.concat(chunk.name)
          : ' '.concat(chunk.name, '="', escapeHTMLContent(chunk.value), '"')
      ) as SerializedHTMLFragment
    case 'endOfOpeningTag':
      return '>' as SerializedHTMLFragment
    case 'closingTag':
      return (
        isVoidElementTagName(lastTagName) ? '' : '</'.concat(lastTagName, '>')
      ) as SerializedHTMLFragment
  }
}

const escapeHTMLContent = (content: string): SerializedHTMLFragment =>
  htmlEntities.encode(content, {
    mode: 'specialChars',
    level: 'html5',
    numeric: 'hexadecimal',
  }) as SerializedHTMLFragment
