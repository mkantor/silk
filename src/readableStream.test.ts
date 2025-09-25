import assert from 'node:assert'
import test, { suite } from 'node:test'
import {
  concatReadableStreams,
  readableStreamFromChunk,
  readableStreamFromIterable,
} from './readableStream.js'
import { arrayFromAsync } from './testUtilities.test.js'

suite('readable stream', _ => {
  test('concatenating nothing', async _ =>
    assert.deepEqual(await arrayFromAsync(concatReadableStreams([])), []))

  test('concatenating non-empty streams', async _ =>
    assert.deepEqual(
      await arrayFromAsync(
        concatReadableStreams([
          readableStreamFromChunk('a'),
          readableStreamFromIterable(['b', 'c']),
          readableStreamFromIterable([]),
          readableStreamFromIterable(readableStreamFromIterable(['d'])),
        ]),
      ),
      ['a', 'b', 'c', 'd'],
    ))
})
