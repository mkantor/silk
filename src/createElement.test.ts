import assert from 'node:assert'
import test, { suite } from 'node:test'
import { createElement } from './createElement.js'
import { readableStreamFromChunk } from './readableStream.js'
import { asArrayOfHTMLFragments } from './testUtilities.test.js'

suite('createElement', _ => {
  test('empty element', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(createElement('a', {})), [
      '<a',
      '>',
      '</a>',
    ]))

  test('element with text content', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(createElement('a', {}, 'a')),
      ['<a', '>', 'a', '</a>'],
    ))

  test('element with string attribute', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        createElement('a', { href: 'https://example.com' }, 'a'),
      ),
      ['<a', ' href="https://example.com"', '>', 'a', '</a>'],
    ))

  test('element with element and non-element children', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        createElement('div', {}, 'a', createElement('div', {}, 'b'), 'c'),
      ),
      ['<div', '>', 'a', '<div', '>', 'b', '</div>', 'c', '</div>'],
    ))

  test('element with multiple separate text children', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(createElement('div', {}, 'a', 'b', 'c')),
      ['<div', '>', 'a', 'b', 'c', '</div>'],
    ))

  test('void elements', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(createElement('br', {})), [
      '<br',
      '>',
    ]))

  test('void element with attribute', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
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
      await asArrayOfHTMLFragments(
        createElement('img', {
          title: 'hello"world',
        }),
      ),
      ['<img', ' title="hello&quot;world"', '>'],
    ))

  test('element with escaped text content', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(createElement('div', {}, '<&>')),
      ['<div', '>', '&lt;&amp;&gt;', '</div>'],
    ))

  test('false boolean attribute', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(createElement('video', { autoplay: false })),
      ['<video', '>', '</video>'],
    ))

  test('true boolean attribute', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(createElement('video', { autoplay: true })),
      ['<video', ' autoplay', '>', '</video>'],
    ))

  test('promise content', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        createElement('div', {}, Promise.resolve('<&>')),
      ),
      ['<div', '>', '&lt;&amp;&gt;', '</div>'],
    ))

  test('stream content', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        createElement('div', {}, readableStreamFromChunk('<&>')),
      ),
      ['<div', '>', '&lt;&amp;&gt;', '</div>'],
    ))

  test('promise of stream content', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        createElement('div', {}, Promise.resolve(createElement('div', {}))),
      ),
      ['<div', '>', '<div', '>', '</div>', '</div>'],
    ))
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
