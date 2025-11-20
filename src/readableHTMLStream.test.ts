import assert from 'node:assert'
import test, { suite } from 'node:test'
import { ReadableHTMLStream } from './readableHTMLStream.js'
import { readableStreamFromChunk } from './readableStream.js'
import { arrayFromAsync, createMockElement } from './testUtilities.test.js'

suite('ReadableHTMLStream', _ => {
  test('consume DOM children from empty stream', async _ => {
    const container = createMockElement('root')
    await ReadableHTMLStream.fromConcatenatedReadableStreams(
      [],
    ).consumeAsDOMChildren(container)

    assert.partialDeepStrictEqual(container, {
      parentElement: null,
      tagName: 'root',
      attributes: new Map(),
      content: [],
    })
  })

  test('consume DOM children from non-empty stream', async _ => {
    const container = createMockElement('root')
    await ReadableHTMLStream.fromConcatenatedReadableStreams([
      readableStreamFromChunk({
        kind: 'text',
        text: 'Hello, world!',
      }),
    ]).consumeAsDOMChildren(container)

    assert.partialDeepStrictEqual(container, {
      parentElement: null,
      tagName: 'root',
      attributes: new Map(),
      content: ['Hello, world!'],
    })
  })

  test('consume DOM children from non-trivial stream', async _ => {
    const container = createMockElement('root')
    await ReadableHTMLStream.fromConcatenatedReadableStreams([
      // <div id="test">
      readableStreamFromChunk({
        kind: 'startOfOpeningTag',
        tagName: 'div',
      }),
      readableStreamFromChunk({
        kind: 'attribute',
        name: 'id',
        value: 'test',
      }),
      readableStreamFromChunk({
        kind: 'endOfOpeningTag',
      }),

      // <h1>title</h1>
      readableStreamFromChunk({
        kind: 'startOfOpeningTag',
        tagName: 'h1',
      }),
      readableStreamFromChunk({
        kind: 'endOfOpeningTag',
      }),
      readableStreamFromChunk({
        kind: 'text',
        text: 'title',
      }),
      readableStreamFromChunk({
        kind: 'closingTag',
      }),

      // <p class="classy">text</p>
      readableStreamFromChunk({
        kind: 'startOfOpeningTag',
        tagName: 'p',
      }),
      readableStreamFromChunk({
        kind: 'attribute',
        name: 'class',
        value: 'classy',
      }),
      readableStreamFromChunk({
        kind: 'endOfOpeningTag',
      }),
      readableStreamFromChunk({
        kind: 'text',
        text: 'text',
      }),
      readableStreamFromChunk({
        kind: 'closingTag',
      }),

      // </div>
      readableStreamFromChunk({
        kind: 'closingTag',
      }),
    ]).consumeAsDOMChildren(container)

    assert.partialDeepStrictEqual(container, {
      parentElement: null,
      tagName: 'root',
      attributes: new Map(),
      content: [
        {
          parentElement: { tagName: 'root' },
          tagName: 'div',
          attributes: new Map([['id', 'test']]),
          content: [
            {
              parentElement: { tagName: 'div' },
              tagName: 'h1',
              attributes: new Map(),
              content: ['title'],
            },
            {
              parentElement: { tagName: 'div' },
              tagName: 'p',
              attributes: new Map([['class', 'classy']]),
              content: ['text'],
            },
          ],
        },
      ],
    })
  })

  test('empty stream as strings without doctype', async _ => {
    const html = await arrayFromAsync(
      ReadableHTMLStream.fromConcatenatedReadableStreams([]).asStrings({
        includeDoctype: false,
      }),
    )

    assert.deepEqual(html, [])
  })

  test('empty stream as strings with doctype', async _ => {
    const html = await arrayFromAsync(
      ReadableHTMLStream.fromConcatenatedReadableStreams([]).asStrings({
        includeDoctype: true,
      }),
    )

    assert.deepEqual(html, ['<!doctype html>'])
  })

  test('non-empty stream as strings without doctype', async _ => {
    const html = await arrayFromAsync(
      ReadableHTMLStream.fromConcatenatedReadableStreams([
        readableStreamFromChunk({
          kind: 'text',
          text: 'Hello, world!',
        }),
      ]).asStrings({
        includeDoctype: false,
      }),
    )

    assert.deepEqual(html, ['Hello, world!'])
  })

  test('non-empty stream as strings with doctype', async _ => {
    const html = await arrayFromAsync(
      ReadableHTMLStream.fromConcatenatedReadableStreams([
        readableStreamFromChunk({
          kind: 'text',
          text: 'Hello, world!',
        }),
      ]).asStrings({
        includeDoctype: true,
      }),
    )

    assert.deepEqual(html, ['<!doctype html>', 'Hello, world!'])
  })

  test('empty stream as bytes without doctype', async _ => {
    const html = await arrayFromAsync(
      ReadableHTMLStream.fromConcatenatedReadableStreams([]).asBytes({
        includeDoctype: false,
      }),
    )

    assert.deepEqual(html, [])
  })

  test('empty stream as bytes with doctype', async _ => {
    const html = await arrayFromAsync(
      ReadableHTMLStream.fromConcatenatedReadableStreams([]).asBytes({
        includeDoctype: true,
      }),
    )

    const encoder = new TextEncoder()
    assert.deepEqual(html, [encoder.encode('<!doctype html>')])
  })

  test('non-empty stream as bytes without doctype', async _ => {
    const html = await arrayFromAsync(
      ReadableHTMLStream.fromConcatenatedReadableStreams([
        readableStreamFromChunk({
          kind: 'text',
          text: 'Hello, world!',
        }),
      ]).asBytes({
        includeDoctype: false,
      }),
    )

    const encoder = new TextEncoder()
    assert.deepEqual(html, [encoder.encode('Hello, world!')])
  })

  test('non-empty stream as bytes with doctype', async _ => {
    const html = await arrayFromAsync(
      ReadableHTMLStream.fromConcatenatedReadableStreams([
        readableStreamFromChunk({
          kind: 'text',
          text: 'Hello, world!',
        }),
      ]).asBytes({
        includeDoctype: true,
      }),
    )

    const encoder = new TextEncoder()
    assert.deepEqual(html, [
      encoder.encode('<!doctype html>'),
      encoder.encode('Hello, world!'),
    ])
  })
})
