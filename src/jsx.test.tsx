import assert from 'node:assert'
import test, { suite } from 'node:test'
import { ReadableStream } from 'web-streams-polyfill'
import { createElement } from './jsx.js'
import { asArrayOfHTMLFragments } from './testUtilities.test.js'

suite('jsx', _ => {
  test('empty fragment', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(<></>), []))

  test('fragment with text content', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(<>blah</>), ['blah']))

  test('fragment with escaping', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(<>&</>), ['&amp;']))

  test('empty element', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(<a></a>), [
      '<a',
      '>',
      '</a>',
    ]))

  test('element with text content', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(<a>a</a>), [
      '<a',
      '>',
      'a',
      '</a>',
    ]))

  test('nested fragments', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        <>
          <a>
            <>
              <>a</>
            </>
          </a>
        </>,
      ),
      ['<a', '>', 'a', '</a>'],
    ))

  test('fragment with element and non-element children', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        <>
          a<a>a</a>a
        </>,
      ),
      ['a', '<a', '>', 'a', '</a>', 'a'],
    ))

  test('element with string attribute', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(<a href="https://example.com">a</a>),
      ['<a', ' href="https://example.com"', '>', 'a', '</a>'],
    ))

  test('element with newlines in content', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(<div>{'\n\n\n\n\n'}</div>), [
      '<div',
      '>',
      '\n\n\n\n\n',
      '</div>',
    ]))

  test('element with element and non-element children', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        <div>
          a<div>b</div>c
        </div>,
      ),
      ['<div', '>', 'a', '<div', '>', 'b', '</div>', 'c', '</div>'],
    ))

  test('element with multiple separate text children', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        <div>
          {'a'}b{'c'}
        </div>,
      ),
      ['<div', '>', 'a', 'b', 'c', '</div>'],
    ))

  test('element with style attribute', async _ => {
    assert.deepEqual(
      await asArrayOfHTMLFragments(<div style="color: red"></div>),
      ['<div', ' style="color: red"', '>', '</div>'],
    )
  })

  test('element with event handler attribute', async _ => {
    assert.deepEqual(
      await asArrayOfHTMLFragments(<div onclick="alert('hi')"></div>),
      ['<div', ' onclick="alert(&apos;hi&apos;)"', '>', '</div>'],
    )
  })

  test('void elements', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        <>
          <br />
          {/* This is legal, but becomes a single self-closing tag: */}
          <br></br>
        </>,
      ),
      ['<br', '>', '<br', '>'],
    ))

  test('self-closing non-void element', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(<div />), [
      '<div',
      '>',
      '</div>',
    ]))

  test('void element with attribute', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(
        <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==" />,
      ),
      [
        '<img',
        ' src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="',
        '>',
      ],
    ))

  test('void element with escaped attribute', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(<img title='hello"world' />),
      ['<img', ' title="hello&quot;world"', '>'],
    ))

  test('element with escaped text content', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(<div>{'<&>'}</div>), [
      '<div',
      '>',
      '&lt;&amp;&gt;',
      '</div>',
    ]))

  test('element with boolean attribute', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(<video autoplay></video>), [
      '<video',
      ' autoplay',
      '>',
      '</video>',
    ]))

  test('false boolean attribute', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(<video autoplay={false}></video>),
      ['<video', '>', '</video>'],
    ))

  test('true boolean attribute', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(<video autoplay={true}></video>),
      ['<video', ' autoplay', '>', '</video>'],
    ))

  test('empty string attribute', async _ =>
    assert.deepEqual(await asArrayOfHTMLFragments(<div class=""></div>), [
      '<div',
      ' class',
      '>',
      '</div>',
    ]))

  test('invalid attribute name', async _ =>
    assert.rejects(async () => {
      for await (const _chunk of (
        <div {...{ ['invalid attribute name']: true }}></div>
      )) {
      }
    }))

  test('invalid attribute value', async _ =>
    assert.rejects(async () => {
      for await (const _chunk of (<div {...{ ['invalid-value']: 42 }}></div>)) {
      }
    }))

  test('stream content', async _ =>
    assert.deepEqual(
      await asArrayOfHTMLFragments(<div>{ReadableStream.from(['<&>'])}</div>),
      ['<div', '>', '&lt;&amp;&gt;', '</div>'],
    ))

  test('array children', async _ => {
    assert.deepEqual(await asArrayOfHTMLFragments(<div>{[<div></div>]}</div>), [
      '<div',
      '>',
      '<div',
      '>',
      '</div>',
      '</div>',
    ])
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

  // @ts-expect-error
  ;<video autoplay="not a boolean"></video>

  // @ts-expect-error
  ;<a nonexistentattribute="value"></a>

  // @ts-expect-error
  ;<div role="some arbitrary string"></div>

  // @ts-expect-error
  ;<div role={Promise.resolve('some arbitrary string')}></div>

  // Promises resolving to union types of valid literals should be valid.
  ;<div role={Promise.resolve(Math.random() > 0.5 ? 'alert' : 'text')}></div>

  // Unfortunately hyphenated attributes are special-cased by TypeScript (see
  // <https://github.com/microsoft/TypeScript/issues/32447>), so this is not a
  // type error.
  ;<a non-existent-attribute={() => '☹️'}></a>
} catch (_) {}
