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
  #tagStack: TagName[] = []
  constructor(options: { readonly includeDoctype: boolean }) {
    super({
      start: controller => {
        if (options.includeDoctype) {
          controller.enqueue('<!doctype html>' as SerializedHTMLFragment)
        }
      },
      transform: (chunk, controller) => {
        if (chunk.kind === 'startOfOpeningTag') {
          this.#tagStack.push(chunk.tagName)
        }
        const htmlFragment = htmlTokenToHTMLFragment(
          chunk,
          this.#tagStack[this.#tagStack.length - 1],
        )
        if (chunk.kind === 'closingTag') {
          this.#tagStack.pop()
        }
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
  currentTagName: TagName | undefined,
): SerializedHTMLFragment => {
  switch (chunk.kind) {
    case 'text':
      return escapeHTMLContent(chunk.text)
    case 'startOfOpeningTag':
      currentTagName = chunk.tagName
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
      if (currentTagName === undefined) {
        throw new Error(
          'Received a `closingTag` token without a current tag name. This is a bug!',
        )
      }
      return (
        isVoidElementTagName(currentTagName)
          ? ''
          : '</'.concat(currentTagName, '>')
      ) as SerializedHTMLFragment
  }
}

const escapeHTMLContent = (content: string): SerializedHTMLFragment =>
  htmlEntities.encode(content, {
    mode: 'specialChars',
    level: 'html5',
    numeric: 'hexadecimal',
  }) as SerializedHTMLFragment
