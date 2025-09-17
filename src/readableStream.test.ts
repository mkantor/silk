import assert from 'node:assert'
import test, { suite } from 'node:test'
import { ReadableStream } from 'web-streams-polyfill'
import { concatReadableStreams } from './readableStream.js'

// TODO: Switch to `Array.fromAsync`.
const arrayFromAsync = async <T>(
  source: AsyncIterable<T>,
): Promise<readonly T[]> => {
  const array = []
  for await (const element of source) {
    array.push(element)
  }
  return array
}

suite('readable stream', _ => {
  test('concatenating nothing', async _ =>
    assert.deepEqual(await arrayFromAsync(concatReadableStreams([])), []))

  test('concatenating non-empty streams', async _ =>
    assert.deepEqual(
      await arrayFromAsync(
        concatReadableStreams([
          ReadableStream.from(['a']),
          ReadableStream.from(['b', 'c']),
          ReadableStream.from([]),
          ReadableStream.from(ReadableStream.from(['d'])),
        ]),
      ),
      ['a', 'b', 'c', 'd'],
    ))
})
