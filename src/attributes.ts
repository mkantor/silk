import type { CSSProperties, HTMLElements, ValueSets } from '@michijs/htmltype'
import { ReadableStream } from 'web-streams-polyfill'
import { escapeHTMLContent } from './escaping.js'
import { trusted, type PossiblyTrusted } from './trust.js'

/**
 * Attribute values are specifically-typed based on the tag and attribute
 * name. Depending on the attribute, the value must ultimately be either a
 * string or a boolean. Attribute values may be deferred via `Promise`s and
 * async iterables.
 */
export type PossiblyDeferredAttributesByTagName = {
  readonly [SpecificTagName in TagName]: {
    readonly [AttributeName in keyof HTMLElements<{}>[SpecificTagName]]: AllowAttributeValueDeferment<
      FixUpAttributeValue<HTMLElements<{}>[SpecificTagName][AttributeName]>
    >
  }
}

export type TagName = keyof HTMLElements<{}>

/**
 * Returns a stream of HTML-encoded attributes with a leading space. Escapes
 * untrusted attribute values.
 */
export const stringifyPossiblyDeferredAttributes = (
  attributes: UnknownPossiblyDeferredAttributes,
): ReadableStream<string> =>
  new ReadableStream({
    start: async controller => {
      for (const [attributeName, attributeValue] of Object.entries(
        attributes,
      )) {
        try {
          const attributeValueIsTrusted =
            typeof attributeValue === 'object' &&
            trusted in attributeValue &&
            attributeValue[trusted] === true

          const awaitedAttributeValue = await attributeValue
          if (
            typeof awaitedAttributeValue === 'object' &&
            awaitedAttributeValue !== null &&
            Symbol.asyncIterator in awaitedAttributeValue
          ) {
            let bufferedAttributeValue = ''
            for await (const attributeValue of awaitedAttributeValue) {
              bufferedAttributeValue =
                bufferedAttributeValue.concat(attributeValue)
            }
            controller.enqueue(
              stringifyAttributeOrThrow(attributeName, bufferedAttributeValue, {
                trusted: attributeValueIsTrusted,
              }),
            )
          } else if (awaitedAttributeValue !== undefined) {
            const stringifiedAttribute = stringifyAttributeOrThrow(
              attributeName,
              awaitedAttributeValue,
              {
                trusted: attributeValueIsTrusted,
              },
            )
            if (stringifiedAttribute !== '') {
              controller.enqueue(stringifiedAttribute)
            }
          }
        } catch (error) {
          controller.error(error)
          return
        }
      }
      controller.close()
    },
  })

/**
 * Returns an HTML-encoded attribute name/value pair with a leading space.
 * Escapes attribute values unless `trusted` is true. For example:
 * ```ts
 * stringifyAttributeOrThrow('href', 'https://example.com?a=1&b=2', { trusted: false })
 * // => ' href="https://example.com?a=1&amp;b=2"'
 * stringifyAttributeOrThrow('href', 'https://example.com?a=1&amp;b=2', { trusted: true })
 * // => ' href="https://example.com?a=1&amp;b=2"'
 * ```
 */
export const stringifyAttributeOrThrow = (
  attributeName: string,
  attributeValue: Primitive,
  { trusted }: { readonly trusted: boolean },
): string => {
  const escapeUnlessTrusted = trusted
    ? (content: string) => content
    : escapeHTMLContent

  if (!isLegalAttributeName(attributeName)) {
    throw new Error(
      `Attribute name \`${attributeName}\` contains one or more invalid characters`,
    )
  } else if (typeof attributeValue === 'string') {
    return ' '.concat(
      escapeUnlessTrusted(attributeName),
      '="',
      escapeUnlessTrusted(attributeValue),
      '"',
    )
  } else if (attributeValue === true) {
    // Boolean attributes do not require a value.
    return ' '.concat(escapeUnlessTrusted(attributeName))
  } else if (attributeValue === false || attributeValue === undefined) {
    return ''
  } else {
    throw new Error(
      `Attribute value for \`${attributeName}\` has invalid type (${typeof attributeValue})`,
    )
  }
}

type FixUpAttributeValue<AttributeValue> =
  // @michijs/htmltype allows `string | number | boolean | null` for many
  // attributes, but we should default to `string`.
  ValueSets['default'] extends AttributeValue
    ? string
    : Extract<
        AttributeValue extends (...parameters: never) => unknown
          ? Exclude<AttributeValue, (...parameters: never) => unknown> | string
          : AttributeValue extends CSSProperties
          ? Exclude<AttributeValue, CSSProperties> | string
          : AttributeValue,
        string | boolean
      >

type AllowAttributeValueDeferment<AttributeValue> =
  | AttributeValue
  // If it's a string, allow deferment by wrapping in a `Promise` or by using an
  // async iterable of substrings.
  | ([AttributeValue] extends [string]
      ?
          | (Promise<AttributeValue> & PossiblyTrusted)
          | (AsyncIterable<string> & PossiblyTrusted)
      : // If it's boolean, allow deferment wrapping in a `Promise` (an iterable
      // doesn't make sense; a boolean is just a single value).
      [AttributeValue] extends [boolean]
      ? Promise<AttributeValue>
      : never)

type UnknownPossiblyDeferredAttributes = {
  readonly [attributeName: string]:
    | string
    | boolean
    | Promise<boolean>
    | (Promise<string> & PossiblyTrusted)
    | (AsyncIterable<string> & PossiblyTrusted)
}

type Primitive = string | number | bigint | boolean | symbol | null | undefined

const isLegalAttributeName = (attributeName: string): boolean =>
  !controlPattern.test(attributeName) &&
  !specialCharacterPattern.test(attributeName) &&
  !noncharacterPattern.test(attributeName)

// The following regular expressions are derived from [the HTML
// spec](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2):

// Attribute names must consist of one or more characters other than controls,
// U+0020 SPACE, U+0022 ("), U+0027 ('), U+003E (>), U+002F (/), U+003D (=), and
// noncharacters.
const specialCharacterPattern = /[ "'>/=]/

// A control is a C0 control or a code point in the range U+007F DELETE to
// U+009F APPLICATION PROGRAM COMMAND, inclusive.
// A C0 control is a code point in the range U+0000 NULL to U+001F INFORMATION
// SEPARATOR ONE, inclusive.
const controlPattern = /[\u0000-\u001F\u007F-\u009F]/

// A noncharacter is a code point that is in the range U+FDD0 to U+FDEF,
// inclusive, or U+FFFE, U+FFFF, U+1FFFE, U+1FFFF, U+2FFFE, U+2FFFF, U+3FFFE,
// U+3FFFF, U+4FFFE, U+4FFFF, U+5FFFE, U+5FFFF, U+6FFFE, U+6FFFF, U+7FFFE,
// U+7FFFF, U+8FFFE, U+8FFFF, U+9FFFE, U+9FFFF, U+AFFFE, U+AFFFF, U+BFFFE,
// U+BFFFF, U+CFFFE, U+CFFFF, U+DFFFE, U+DFFFF, U+EFFFE, U+EFFFF, U+FFFFE,
// U+FFFFF, U+10FFFE, or U+10FFFF.
const noncharacterPattern =
  /[\uFDD0-\uFDEF\uFFFE\uFFFF\u1FFFE\u1FFFF\u2FFFE\u2FFFF\u3FFFE\u3FFFF\u4FFFE\u4FFFF\u5FFFE\u5FFFF\u6FFFE\u6FFFF\u7FFFE\u7FFFF\u8FFFE\u8FFFF\u9FFFE\u9FFFF\uAFFFE\uAFFFF\uBFFFE\uBFFFF\uCFFFE\uCFFFF\uDFFFE\uDFFFF\uEFFFE\uEFFFF\uFFFFE\uFFFFF\u10FFFE\u10FFFF]/
