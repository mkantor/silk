import type { ReadableHTMLStream } from './createElement.js'
import { HTMLSerializingTransformStream } from './transformStreams.js'

// TODO: Switch to `Array.fromAsync`.
export const arrayFromAsync = async <T>(
  source: AsyncIterable<T>,
): Promise<readonly T[]> => {
  const array = []
  for await (const element of source) {
    array.push(element)
  }
  return array
}

export const asArrayOfHTMLFragments = async (source: ReadableHTMLStream) =>
  arrayFromAsync(
    source.pipeThrough(
      new HTMLSerializingTransformStream({ includeDoctype: false }),
    ),
  )
