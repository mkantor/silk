import assert from 'node:assert'
import test, { suite } from 'node:test'
import type { HTMLToken } from './htmlToken.js'
import { readableStreamFromIterable } from './readableStream.js'
import { arrayFromAsync } from './testUtilities.test.js'
import {
  HTMLSerializingTransformStream,
  TextCapturingTransformStream,
} from './transformStreams.js'

suite('transform streams', _ => {
  test('text capturing', async _ => {
    assert.deepEqual(
      await arrayFromAsync(
        readableStreamFromIterable([
          { kind: 'startOfOpeningTag', tagName: 'a' } satisfies HTMLToken,
          { kind: 'endOfOpeningTag' } satisfies HTMLToken,
          'a',
          { kind: 'text', text: 'b' } satisfies HTMLToken,
          'c',
          { kind: 'closingTag' } satisfies HTMLToken,
        ]).pipeThrough(new TextCapturingTransformStream()),
      ),
      [
        { kind: 'startOfOpeningTag', tagName: 'a' },
        { kind: 'endOfOpeningTag' },
        { kind: 'text', text: 'a' },
        { kind: 'text', text: 'b' },
        { kind: 'text', text: 'c' },
        { kind: 'closingTag' },
      ],
    )
  })

  test('HTML serialization', async _ => {
    assert.deepEqual(
      await arrayFromAsync(
        readableStreamFromIterable([
          { kind: 'startOfOpeningTag', tagName: 'a' },
          {
            kind: 'attribute',
            name: 'class',
            value: 'foo',
          },
          {
            kind: 'attribute',
            name: 'autofocus',
            value: '',
          },
          {
            kind: 'attribute',
            name: 'href',
            value: 'https://example.com?a=1&b=2',
          },
          { kind: 'endOfOpeningTag' },
          { kind: 'text', text: 'a' },
          { kind: 'text', text: 'b' },
          { kind: 'text', text: 'c' },
          { kind: 'closingTag' },
        ]).pipeThrough(new HTMLSerializingTransformStream()),
      ),
      [
        '<a',
        ' class="foo"',
        ' autofocus',
        ' href="https://example.com?a=1&amp;b=2"',
        '>',
        'a',
        'b',
        'c',
        '</a>',
      ],
    )
  })
})
