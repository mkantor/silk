import assert from 'node:assert'
import test, { suite } from 'node:test'
import { ReadableStream } from 'web-streams-polyfill'
import { concatReadableStreams } from './readableStream.js'
import { arrayFromAsync } from './testUtilities.test.js'

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
