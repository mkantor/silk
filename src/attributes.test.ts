import assert from 'node:assert'
import test, { suite } from 'node:test'
import { possiblyDeferredAttributesToHTMLTokenStream } from './attributes.js'
import { arrayFromAsync } from './testUtilities.test.js'

suite('attributes', _ => {
  test('basic attributes', async _ =>
    assert.deepEqual(
      await arrayFromAsync(
        possiblyDeferredAttributesToHTMLTokenStream({
          id: 'a',
          title: 'Calvin & Hobbes',
          autoplay: true,
          autofocus: false,
        }),
      ),
      [
        { kind: 'attribute', name: 'id', value: 'a' },
        // Note that no escaping happens yet. That's during serialization.
        { kind: 'attribute', name: 'title', value: 'Calvin & Hobbes' },
        { kind: 'attribute', name: 'autoplay', value: '' },
      ],
    ))

  test('invalid attribute value', _ =>
    assert.rejects(async () => {
      const invalidAttributes: {} = { oops: 42 }
      for await (const _chunk of possiblyDeferredAttributesToHTMLTokenStream(
        invalidAttributes,
      )) {
      }
    }))

  test('invalid attribute name', _ =>
    assert.rejects(async () => {
      const invalidAttributes: {} = { ['invalid attribute']: '' }
      for await (const _chunk of possiblyDeferredAttributesToHTMLTokenStream(
        invalidAttributes,
      )) {
      }
    }))

  test('deferred attributes', async _ =>
    assert.deepEqual(
      await arrayFromAsync(
        possiblyDeferredAttributesToHTMLTokenStream({
          autoplay: Promise.resolve(true),
          checked: Promise.resolve(false),
          href: Promise.resolve('https://example.com?a=1&b=2'),
          class: ReadableStream.from(['a', ' b', ' c']),
          name: ReadableStream.from(['a', '&', 'b']),
        }),
      ),
      [
        { kind: 'attribute', name: 'autoplay', value: '' },
        {
          kind: 'attribute',
          name: 'href',
          value: 'https://example.com?a=1&b=2',
        },
        { kind: 'attribute', name: 'class', value: 'a b c' },
        { kind: 'attribute', name: 'name', value: 'a&b' },
      ],
    ))
})
