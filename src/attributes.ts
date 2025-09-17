import type { HTMLElements } from '@michijs/htmltype'
import { escapeHTMLContent } from './escaping.js'

export type AttributesByTagName = {
  readonly [TagName in keyof HTMLElements<{}>]: {
    readonly [AttributeName in keyof HTMLElements<{}>[TagName]]: Extract<
      FixUpEventHandlers<HTMLElements<{}>[TagName][AttributeName]>,
      // TODO: Only allow `boolean` for attributes that are actually boolean.
      string | boolean
    >
  }
}

/**
 * Returns a string of HTML attributes with a leading space. Escapes attribute
 * values. For example:
 * ```ts
 * stringifyAttributes({
 *   title: 'Hello, world!',
 *   href: 'https://example.com?a=1&b=2',
 * }) // => ' title="Hello, world!" href="https://example.com?a=1&amp;b=2"'
 * ```
 */
export const stringifyAttributes = (attributes: UnknownAttributes): string =>
  Object.entries(attributes).reduce(
    (stringifiedAttributes, [attributeName, attributeValue]) => {
      // We're iterating over an object which may have arbitrary excess
      // properties, so paranoia is warranted.
      if (!isLegalAttributeName(attributeName)) {
        throw new Error(
          `Attribute name \`${attributeName}\` contains one or more invalid characters`,
        )
      } else if (typeof attributeValue === 'string') {
        return stringifiedAttributes.concat(
          ' ',
          escapeHTMLContent(attributeName),
          '="',
          escapeHTMLContent(attributeValue),
          '"',
        )
      } else if (attributeValue === true) {
        // Boolean attributes do not require a value.
        return stringifiedAttributes.concat(
          ' ',
          escapeHTMLContent(attributeName),
        )
      } else if (attributeValue === false) {
        return stringifiedAttributes
      } else {
        throw new Error(
          `Attribute value for \`${attributeName}\` has invalid type (${typeof attributeValue})`,
        )
      }
    },
    '',
  )

// @michijs/htmltype uses functions for event handlers, but here they should be
// strings (just like other attributes).
type FixUpEventHandlers<AttributeValue> = AttributeValue extends (
  ...parameters: never
) => unknown
  ? Exclude<AttributeValue, (...parameters: never) => unknown> | string
  : AttributeValue

type UnknownAttributes = AttributesByTagName[keyof AttributesByTagName]

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
