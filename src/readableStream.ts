export const concatReadableStreams = <T>(
  streams: readonly ReadableStream<T>[],
): ReadableStream<T> => {
  let currentIndex = 0
  let currentIterator: AsyncIterator<T> | undefined =
    streams[currentIndex]?.[Symbol.asyncIterator]()

  return new ReadableStream({
    pull: async controller => {
      let nextResult: IteratorResult<T, undefined> = {
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

export const readableStreamFromChunk = <R>(
  chunk: R,
): ReadableStream<Awaited<R>> =>
  new ReadableStream({
    pull: async controller => {
      try {
        const awaitedChunk = await chunk
        controller.enqueue(awaitedChunk)
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

// TODO: Adopt `ReadableStream.from`.
export const readableStreamFromIterable = <R>(
  iterable: AsyncIterable<R> | Iterable<R>,
): ReadableStream<R> => {
  const iterator =
    Symbol.asyncIterator in iterable
      ? iterable[Symbol.asyncIterator]()
      : iterable[Symbol.iterator]()
  return new ReadableStream({
    pull: async controller => {
      try {
        const nextResult = await iterator.next()
        if (nextResult.done) {
          controller.close()
        } else {
          controller.enqueue(nextResult.value)
        }
      } catch (error) {
        controller.error(error)
      }
    },
  })
}
