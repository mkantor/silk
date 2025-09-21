import assert from 'node:assert'
import test, { suite } from 'node:test'
import { ReadableStream } from 'web-streams-polyfill'
import {
  trusted,
  type PossiblyDeferredHTML,
  type ReadableHTMLStream,
} from './createElement.js'
import { createElement } from './jsx.js'

// TODO: Switch to `Array.fromAsync`.
const arrayFromPossiblyDeferredHTML = async (source: PossiblyDeferredHTML) => {
  const array = []
  for await (const element of await source) {
    array.push(element)
  }
  return array
}

suite('jsx', _ => {
  test('empty fragment', async _ =>
    assert.deepEqual(await arrayFromPossiblyDeferredHTML(<></>), []))

  test('fragment with text content', async _ =>
    assert.deepEqual(await arrayFromPossiblyDeferredHTML(<>blah</>), ['blah']))

  test('fragment with escaping', async _ =>
    assert.deepEqual(await arrayFromPossiblyDeferredHTML(<>&</>), ['&amp;']))

  test('empty element', async _ =>
    assert.deepEqual(await arrayFromPossiblyDeferredHTML(<a></a>), [
      '<a>',
      '</a>',
    ]))

  test('element with text content', async _ =>
    assert.deepEqual(await arrayFromPossiblyDeferredHTML(<a>a</a>), [
      '<a>',
      'a',
      '</a>',
    ]))

  test('nested fragments', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        <>
          <a>
            <>
              <>a</>
            </>
          </a>
        </>,
      ),
      ['<a>', 'a', '</a>'],
    ))

  test('fragment with element and non-element children', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        <>
          a<a>a</a>a
        </>,
      ),
      ['a', '<a>', 'a', '</a>', 'a'],
    ))

  test('element with string attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(<a href="https://example.com">a</a>),
      ['<a href="https://example.com">', 'a', '</a>'],
    ))

  test('element with newlines in content', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(<div>{'\n\n\n\n\n'}</div>),
      ['<div>', '\n\n\n\n\n', '</div>'],
    ))

  test('element with element and non-element children', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        <div>
          a<div>b</div>c
        </div>,
      ),
      ['<div>', 'a', '<div>', 'b', '</div>', 'c', '</div>'],
    ))

  test('element with multiple separate text children', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        <div>
          {'a'}b{'c'}
        </div>,
      ),
      ['<div>', 'a', 'b', 'c', '</div>'],
    ))

  test('void elements', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        <>
          <br />
          {/* This is legal, but becomes a single self-closing tag: */}
          <br></br>
        </>,
      ),
      ['<br>', '<br>'],
    ))

  test('self-closing non-void element', async _ =>
    assert.deepEqual(await arrayFromPossiblyDeferredHTML(<div />), [
      '<div>',
      '</div>',
    ]))

  test('void element with attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==" />,
      ),
      [
        '<img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==">',
      ],
    ))

  test('void element with escaped attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(<img title='hello"world' />),
      ['<img title="hello&quot;world">'],
    ))

  test('element with escaped text content', async _ =>
    assert.deepEqual(await arrayFromPossiblyDeferredHTML(<div>{'<&>'}</div>), [
      '<div>',
      '&lt;&amp;&gt;',
      '</div>',
    ]))

  test('element with boolean attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(<video autoplay></video>),
      ['<video autoplay>', '</video>'],
    ))

  test('false boolean attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(<video autoplay={false}></video>),
      ['<video>', '</video>'],
    ))

  test('true boolean attribute', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(<video autoplay={true}></video>),
      ['<video autoplay>', '</video>'],
    ))

  test('invalid attribute name', async _ =>
    assert.throws(() => <div {...{ ['invalid attribute name']: true }}></div>))

  test('invalid attribute value', async _ =>
    assert.throws(() => <div {...{ 'invalid-value': 42 }}></div>))

  test('promise content', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(<div>{Promise.resolve('<&>')}</div>),
      ['<div>', '&lt;&amp;&gt;', '</div>'],
    ))

  test('stream content', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        <div>{ReadableStream.from(['<&>'])}</div>,
      ),
      ['<div>', '&lt;&amp;&gt;', '</div>'],
    ))

  test('trusted promise content', async _ => {
    const trustedPromise: Promise<string> & { [trusted]?: true } =
      Promise.resolve('<marquee>🕴</marquee>')
    trustedPromise[trusted] = true
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(<div>{trustedPromise}</div>),
      [
        '<div>',
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
      await arrayFromPossiblyDeferredHTML(<div>{trustedStream}</div>),
      [
        '<div>',
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
  ;<FunctionWhichShouldNotBeUsableAsAComponent />

  // @ts-expect-error
  ;<ClassWhichShouldNotBeUsableAsAComponent />

  // @ts-expect-error
  ;<br>illegal</br>

  // @ts-expect-error
  ;<non-existent-element />

  // @ts-expect-error
  ;<button onclick={_ => {}} /> // Attribute values must be strings or booleans.

  // @ts-expect-error
  ;<a nonexistentattribute></a>

  // @ts-expect-error
  ;<a href={new URL()}></a>

  // @ts-expect-error
  ;<div class={true}></div>

  // @ts-expect-error
  ;<a nonexistentattribute="value"></a>

  // Unfortunately hyphenated attributes are special-cased by TypeScript (see
  // <https://github.com/microsoft/TypeScript/issues/32447>), so this is not a
  // type error.
  ;<a non-existent-attribute={() => '☹️'}></a>
} catch (_) {}
