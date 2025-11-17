import { consumeAsDOMChildren, type ElementLike } from './dom.js'
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

  consumeAsDOMChildren(container: ElementLike): Promise<undefined> {
    return consumeAsDOMChildren(container, this)
  }
}
