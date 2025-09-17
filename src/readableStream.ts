import { ReadableStream } from 'web-streams-polyfill'

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
