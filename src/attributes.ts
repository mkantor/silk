import type { CSSProperties, HTMLElements, ValueSets } from '@michijs/htmltype'
import type { HTMLToken } from './htmlToken.js'
import { readableStreamFromIterable } from './readableStream.js'
import type { Primitive } from './utilityTypes.js'

/**
 * Attribute values are specifically-typed based on the tag and attribute name.
 * Depending on the attribute, the value must ultimately be either a string or a
 * boolean. Attribute values may be deferred via `Promise`s and async iterables.
 */
export type AttributesByTagName = {
  readonly [SpecificTagName in keyof HTMLElements<{}>]: {
    readonly [AttributeName in keyof HTMLElements<{}>[SpecificTagName]]: AllowAttributeValueDeferment<
      FixUpAttributeValue<HTMLElements<{}>[SpecificTagName][AttributeName]>
    >
  }
}

/**
 * The returned `ReadableStream` will emit an error if any attributes are
 * invalid.
 */
export const attributesToHTMLTokenStream = (
  attributes: UnknownAttributes,
): ReadableStream<AttributeHTMLToken> =>
  readableStreamFromIterable(Object.entries(attributes)).pipeThrough(
    new TransformStream({
      transform: async ([attributeName, attributeValue], controller) => {
        try {
          const awaitedAttributeValue = await attributeValue
          if (
            typeof awaitedAttributeValue === 'object' &&
            awaitedAttributeValue !== null &&
            Symbol.asyncIterator in awaitedAttributeValue
          ) {
            // Async iterable attribute values are buffered and emitted as a
            // single attribute value.
            let bufferedAttributeValue = ''
            for await (const attributeValue of awaitedAttributeValue) {
              bufferedAttributeValue =
                bufferedAttributeValue.concat(attributeValue)
            }
            controller.enqueue(
              makeStringAttributeOrThrow(attributeName, bufferedAttributeValue),
            )
          } else if (awaitedAttributeValue !== undefined) {
            const token = makeAttributeHTMLTokenOrThrow(
              attributeName,
              awaitedAttributeValue,
            )
            if (token !== undefined) {
              controller.enqueue(token)
            }
          }
        } catch (error) {
          controller.error(error)
        }
      },
    }),
  )

type AttributeHTMLToken = Extract<HTMLToken, { kind: 'attribute' }>

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
      ? Promise<AttributeValue> | AsyncIterable<string>
      : // If it's boolean, allow deferment wrapping in a `Promise` (an iterable
      // doesn't make sense; a boolean is just a single value).
      [AttributeValue] extends [boolean]
      ? Promise<AttributeValue>
      : never)

type UnknownAttributes = {
  readonly [attributeName: string]:
    | string
    | boolean
    | Promise<boolean>
    | Promise<string>
    | AsyncIterable<string>
}

/**
 * Throws an error if the attribute name is malformed or if the value has an
 * invalid type.
 */
const makeAttributeHTMLTokenOrThrow = (
  attributeName: string,
  attributeValue: Primitive,
): AttributeHTMLToken | undefined => {
  if (typeof attributeValue === 'string') {
    return makeStringAttributeOrThrow(attributeName, attributeValue)
  } else if (
    typeof attributeValue === 'boolean' ||
    attributeValue === undefined
  ) {
    return makeBooleanOrUndefinedAttributeOrThrow(attributeName, attributeValue)
  } else {
    throw new Error(
      `Attribute value for \`${attributeName}\` has invalid type (${typeof attributeValue})`,
    )
  }
}

const makeStringAttributeOrThrow = (
  attributeName: string,
  attributeValue: string,
): AttributeHTMLToken => {
  assertValidAttributeName(attributeName)
  return {
    kind: 'attribute',
    name: attributeName,
    value: attributeValue,
  }
}

const makeBooleanOrUndefinedAttributeOrThrow = (
  attributeName: string,
  attributeValue: boolean | undefined,
): AttributeHTMLToken | undefined => {
  assertValidAttributeName(attributeName)
  if (attributeValue === true) {
    // [The HTML
    // specification](https://html.spec.whatwg.org/multipage/syntax.html#attributes-2)
    // says this about boolean attributes:
    // > If the attribute is present, its value must either be the empty string
    // > or a value that is an ASCII case-insensitive match for the attribute's
    // > canonical name, with no leading or trailing whitespace.
    return {
      kind: 'attribute',
      name: attributeName,
      value: '',
    }
  } else {
    return undefined
  }
}

const assertValidAttributeName = (attributeName: string) => {
  if (!isLegalAttributeName(attributeName)) {
    throw new Error(
      `Attribute name \`${attributeName}\` contains one or more invalid characters`,
    )
  }
}

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
// U+009F APPLICATION PROGRAM COMMAND, inclusive. A C0 control is a code point
// in the range U+0000 NULL to U+001F INFORMATION SEPARATOR ONE, inclusive.
const controlPattern = /[\u0000-\u001F\u007F-\u009F]/

// A noncharacter is a code point that is in the range U+FDD0 to U+FDEF,
// inclusive, or U+FFFE, U+FFFF, U+1FFFE, U+1FFFF, U+2FFFE, U+2FFFF, U+3FFFE,
// U+3FFFF, U+4FFFE, U+4FFFF, U+5FFFE, U+5FFFF, U+6FFFE, U+6FFFF, U+7FFFE,
// U+7FFFF, U+8FFFE, U+8FFFF, U+9FFFE, U+9FFFF, U+AFFFE, U+AFFFF, U+BFFFE,
// U+BFFFF, U+CFFFE, U+CFFFF, U+DFFFE, U+DFFFF, U+EFFFE, U+EFFFF, U+FFFFE,
// U+FFFFF, U+10FFFE, or U+10FFFF.
const noncharacterPattern =
  /[\uFDD0-\uFDEF\uFFFE\uFFFF\u1FFFE\u1FFFF\u2FFFE\u2FFFF\u3FFFE\u3FFFF\u4FFFE\u4FFFF\u5FFFE\u5FFFF\u6FFFE\u6FFFF\u7FFFE\u7FFFF\u8FFFE\u8FFFF\u9FFFE\u9FFFF\uAFFFE\uAFFFF\uBFFFE\uBFFFF\uCFFFE\uCFFFF\uDFFFE\uDFFFF\uEFFFE\uEFFFF\uFFFFE\uFFFFF\u10FFFE\u10FFFF]/
