export const concatReadableStreams = <T>(
  streams: readonly ReadableStream<T>[],
): ReadableStream<T> =>
  new ReadableStream({
    start: async controller => {
      try {
        for (const stream of streams) {
          for await (const chunk of stream) {
            controller.enqueue(chunk)
          }
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

export const readableStreamFromChunk = <R>(chunk: R): ReadableStream<R> =>
  new ReadableStream({
    pull: async (controller): Promise<undefined> => {
      controller.enqueue(chunk)
      controller.close()
    },
  })

// TODO: Adopt `ReadableStream.from`.
export const readableStreamFromIterable = <R>(
  iterable: Iterable<R> | AsyncIterable<R>,
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
