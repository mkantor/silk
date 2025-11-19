import type { HTMLToken } from './htmlToken.js'
import {
  HTMLSerializingTransformStream,
  type SerializedHTMLFragment,
} from './transformStreams.js'

export class ReadableHTMLStream extends ReadableStream<HTMLToken> {
  static fromConcatenatedReadableStreams(
    streams: readonly ReadableStream<HTMLToken>[],
  ): ReadableHTMLStream {
    let currentIndex = 0
    let currentIterator = streams[currentIndex]?.[Symbol.asyncIterator]()

    return new ReadableHTMLStream({
      pull: async controller => {
        let nextResult: IteratorResult<HTMLToken, undefined> = {
          done: true,
          value: undefined,
        }
        while (nextResult.done && currentIterator !== undefined) {
          try {
            nextResult = await currentIterator.next()
            if (nextResult.done) {
              // Try again with the next stream.
              currentIndex = currentIndex + 1
              currentIterator = streams[currentIndex]?.[Symbol.asyncIterator]()
            }
          } catch (error) {
            controller.error(error)
            return
          }
        }

        if (nextResult.done) {
          controller.close()
        } else {
          controller.enqueue(nextResult.value)
        }
      },
    })
  }

  asStrings(options: {
    readonly includeDoctype: boolean
  }): ReadableStream<SerializedHTMLFragment> {
    return this.pipeThrough(new HTMLSerializingTransformStream(options))
  }

  asBytes(options: {
    readonly includeDoctype: boolean
  }): ReadableStream<Uint8Array<ArrayBufferLike>> {
    return this.asStrings(options).pipeThrough(new TextEncoderStream())
  }

  /**
   * Reads `HTMLToken`s from `this` and uses them to update the DOM tree
   * rooted at `container`.
   */
  async consumeAsDOMChildren(container: ElementLike): Promise<undefined> {
    let currentElement = container
    for await (const token of this) {
      switch (token.kind) {
        case 'text': {
          currentElement.append(token.text)
          break
        }
        case 'startOfOpeningTag': {
          const newElement = currentElement.ownerDocument.createElement(
            token.tagName,
          )
          currentElement.append(newElement)
          currentElement = newElement
          break
        }
        case 'attribute': {
          currentElement.setAttribute(token.name, token.value)
          break
        }
        case 'endOfOpeningTag': {
          // no-op
          break
        }
        case 'closingTag': {
          const parentElement = currentElement.parentElement
          if (parentElement === null) {
            throw new Error('Parent element does not exist')
          }
          currentElement = parentElement
          break
        }
      }
    }
  }
}

// To avoid pulling in global DOM types (which could be problematic for
// server-side usage), the necessary subset of the `Element` API is re-specified
// here.
type ElementLike = {
  readonly ownerDocument: {
    readonly createElement: (tagName: string) => ElementLike
  }
  readonly setAttribute: (name: string, value: string) => void
  readonly parentElement: ElementLike | null

  // Method syntax (with unsafely-bivariant parameter types) is used here
  // because otherwise the entire `Node` API (and all of its related types)
  // would need to be re-specified. In order for a real `Element` to be truly
  // safely assignable to `ElementLike`, its `append` parameter list (which
  // mentions `Node`) needs to be a *supertype* of this parameter list.
  //
  // While this is not strictly safe/correct, you'd have to go far out of your
  // way to intentionally break things for problems to arise.
  append(...nodes: readonly (NodeLike | string)[]): void
}

// Only a common supertype of `ElementLike` and `Node` is necessary here:
type NodeLike = Pick<ElementLike, 'parentElement'>
