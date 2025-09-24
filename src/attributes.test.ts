import assert from 'node:assert'
import test, { suite } from 'node:test'
import {
  stringifyAttributeOrThrow,
  stringifyPossiblyDeferredAttributes,
} from './attributes.js'
import type { PossiblyDeferredHTML } from './createElement.js'
import { trusted, type PossiblyTrusted, type Trusted } from './trust.js'

// TODO: Switch to `Array.fromAsync`.
const arrayFromPossiblyDeferredHTML = async (source: PossiblyDeferredHTML) => {
  const array = []
  for await (const element of await source) {
    array.push(element)
  }
  return array
}

suite('attributes', _ => {
  test('basic attribute', _ =>
    assert.deepEqual(
      stringifyAttributeOrThrow('class', 'a', {
        trusted: false,
      }),
      ' class="a"',
    ))

  test('attribute with escaping', _ =>
    assert.deepEqual(
      stringifyAttributeOrThrow('href', 'https://example.com?a=1&b=2', {
        trusted: false,
      }),
      ' href="https://example.com?a=1&amp;b=2"',
    ))

  test('trusted attribute', _ =>
    assert.deepEqual(
      stringifyAttributeOrThrow('href', 'https://example.com?a=1&amp;b=2', {
        trusted: true,
      }),
      ' href="https://example.com?a=1&amp;b=2"',
    ))

  test('invalid attribute value', _ => {
    assert.throws(() =>
      stringifyAttributeOrThrow('oops', 42, { trusted: false }),
    )
    assert.throws(() =>
      stringifyAttributeOrThrow('oops', 42, { trusted: true }),
    )
  })

  test('invalid attribute name', _ => {
    assert.throws(() =>
      stringifyAttributeOrThrow('invalid attribute', '', {
        trusted: false,
      }),
    )
    assert.throws(() =>
      stringifyAttributeOrThrow('invalid attribute', '', {
        trusted: true,
      }),
    )
  })

  test('possibly-deferred attributes', async _ =>
    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        stringifyPossiblyDeferredAttributes({
          id: 'a',
          title: 'Calvin & Hobbes',
          autofocus: true,
          allowfullscreen: false,
          autoplay: Promise.resolve(true),
          checked: Promise.resolve(false),
          href: Promise.resolve('https://example.com?a=1&b=2'),
          class: ReadableStream.from(['a', ' b', ' c']),
          name: ReadableStream.from(['a', '&', 'b']),
        }),
      ),
      [
        ' id="a"',
        ' title="Calvin &amp; Hobbes"',
        ' autofocus',
        ' autoplay',
        ' href="https://example.com?a=1&amp;b=2"',
        ' class="a b c"',
        ' name="a&amp;b"',
      ],
    ))

  test('trusted deferred attributes', async _ => {
    const trust: <A extends object>(
      value: A,
    ) => asserts value is A & Trusted = value => {
      const possiblyTrustedValue: object & PossiblyTrusted = value
      possiblyTrustedValue[trusted] = true
    }

    // Trusting `Promise<boolean>`s does nothing, but should be allowed.
    const trustedPromiseOfTrue = Promise.resolve(true)
    trust(trustedPromiseOfTrue)
    const trustedPromiseOfFalse = Promise.resolve(false)
    trust(trustedPromiseOfFalse)

    const trustedPromiseOfString = Promise.resolve(
      'https://example.com?a=1&amp;b=2',
    )
    trust(trustedPromiseOfString)

    const trustedStream = ReadableStream.from(['a', '&amp;', 'b'])
    trust(trustedStream)

    assert.deepEqual(
      await arrayFromPossiblyDeferredHTML(
        stringifyPossiblyDeferredAttributes({
          autofocus: trustedPromiseOfTrue,
          allowfullscreen: trustedPromiseOfFalse,
          href: trustedPromiseOfString,
          name: trustedStream,
        }),
      ),
      [
        ' autofocus',
        ' href="https://example.com?a=1&amp;b=2"',
        ' name="a&amp;b"',
      ],
    )
  })
})
