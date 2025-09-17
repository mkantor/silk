import assert from 'node:assert'
import test, { suite } from 'node:test'
import { stringifyAttributes } from './attributes.js'

suite('attributes', _ => {
  test('multiple attributes with escaping', _ =>
    assert.deepEqual(
      stringifyAttributes({
        title: 'Hello, world!',
        href: 'https://example.com?a=1&b=2',
      }),
      ' title="Hello, world!" href="https://example.com?a=1&amp;b=2"',
    ))

  test('no attributes', _ => assert.deepEqual(stringifyAttributes({}), ''))

  test('invalid attribute value', _ => {
    const unsafeAttributes = {
      oops: () => {
        /* secret business logic */
      },
    }
    assert.throws(() => stringifyAttributes(unsafeAttributes))
  })

  test('invalid attribute name', _ => {
    const unsafeAttributes = { 'invalid attribute': '' }
    assert.throws(() => stringifyAttributes(unsafeAttributes))
  })
})
