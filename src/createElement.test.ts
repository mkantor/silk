import assert from 'node:assert'
import test, { suite } from 'node:test'
import { ReadableStream } from 'web-streams-polyfill'
import {
  createElement,
  type PossiblyDeferredHTML,
  type ReadableHTMLStream,
} from './createElement.js'
import { trusted } from './trust.js'

// TODO: Switch to `Array.fromAsync`.
const arrayFromPossiblyDeferredHTML = async (source: PossiblyDeferredHTML) => {
  const array = []
  for await (const element of await source) {
    array.push(element)
  }
  return array
}

suite('createElement', _ => {
  test('empty element', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(createElement('a', {})),
      ['<a', '>', '</a>'],
    ))

  test('element with text content', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(createElement('a', {}, 'a')),
      ['<a', '>', 'a', '</a>'],
    ))

  test('element with string attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('a', { href: 'https://example.com' }, 'a'),
      ),
      ['<a', ' href="https://example.com"', '>', 'a', '</a>'],
    ))

  test('element with element and non-element children', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('div', {}, 'a', createElement('div', {}, 'b'), 'c'),
      ),
      ['<div', '>', 'a', '<div', '>', 'b', '</div>', 'c', '</div>'],
    ))

  test('element with multiple separate text children', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('div', {}, 'a', 'b', 'c'),
      ),
      ['<div', '>', 'a', 'b', 'c', '</div>'],
    ))

  test('void elements', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(createElement('br', {})),
      ['<br', '>'],
    ))

  test('void element with attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('img', {
          src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==',
        }),
      ),
      [
        '<img',
        ' src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="',
        '>',
      ],
    ))

  test('void element with escaped attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('img', {
          title: 'hello"world',
        }),
      ),
      ['<img', ' title="hello&quot;world"', '>'],
    ))

  test('element with escaped text content', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(createElement('div', {}, '<&>')),
      ['<div', '>', '&lt;&amp;&gt;', '</div>'],
    ))

  test('false boolean attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('video', { autoplay: false }),
      ),
      ['<video', '>', '</video>'],
    ))

  test('true boolean attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('video', { autoplay: true }),
      ),
      ['<video', ' autoplay', '>', '</video>'],
    ))

  test('promise content', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('div', {}, Promise.resolve('<&>')),
      ),
      ['<div', '>', '&lt;&amp;&gt;', '</div>'],
    ))

  test('stream content', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('div', {}, ReadableStream.from(['<&>'])),
      ),
      ['<div', '>', '&lt;&amp;&gt;', '</div>'],
    ))

  test('trusted promise content', async _ => {
    const trustedPromise: Promise<string> & { [trusted]?: true } =
      Promise.resolve('<marquee>🕴</marquee>')
    trustedPromise[trusted] = true
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('div', {}, trustedPromise),
      ),
      [
        '<div',
        '>',
        '<marquee>🕴</marquee>', // No escaping.
        '</div>',
      ],
    )
  })

  test('trusted stream content', async _ => {
    const trustedStream: ReadableHTMLStream = ReadableStream.from([
      '<marquee>🕴</marquee>',
    ])
    trustedStream[trusted] = true
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        createElement('div', {}, trustedStream),
      ),
      [
        '<div',
        '>',
        '<marquee>🕴</marquee>', // No escaping.
        '</div>',
      ],
    )
  })
})

// Type-level tests:
try {
  function FunctionWhichShouldNotBeUsableAsAComponent() {}
  class ClassWhichShouldNotBeUsableAsAComponent {}

  // @ts-expect-error
  createElement(FunctionWhichShouldNotBeUsableAsAComponent, {})

  // @ts-expect-error
  createElement(ClassWhichShouldNotBeUsableAsAComponent, {})

  // @ts-expect-error
  createElement('br', {}, 'illegal')

  // @ts-expect-error
  createElement('non-existent-element', {})

  // @ts-expect-error
  createElement('button', { onclick: () => {} }) // Attribute values must be strings or booleans.

  // @ts-expect-error
  createElement('a', { nonexistentattribute: true })

  // @ts-expect-error
  createElement('a', { nonexistentattribute: 'value' })

  // @ts-expect-error
  createElement('a', { href: new URL() })

  // @ts-expect-error
  createElement('a', { class: true })

  // @ts-expect-error
  createElement('a', { 'non-existent-attribute': 'value' })
} catch (_) {}
