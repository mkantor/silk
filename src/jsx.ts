import type { AttributesByTagName } from './attributes.js'
import type { Children, ReadableHTMLStream } from './createElement.js'

export { createElement } from './createElement.js'

// See <https://www.typescriptlang.org/docs/handbook/jsx.html>.
export declare namespace createElement.JSX {
  // This type alias exists to improve type info for JSX tags.
  type HTML<TagName extends keyof AttributesByTagName> =
    AttributesByTagName[TagName] & {
      // This results in void elements having `never` for `_children`.
      readonly [_children]?: Children<TagName>[number]
    }

  type IntrinsicElements = {
    [TagName in keyof AttributesByTagName]: HTML<TagName>
  }

  type ElementChildrenAttribute = {
    readonly [_children]: unknown // Only the property name matters.
  }

  /** There are no function/class components, just intrinsic elements. */
  type ElementType = keyof IntrinsicElements

  type Element = ReadableHTMLStream

  type ElementClass = never
}

// This is only used for typing element children. It never exists at runtime.
declare const _children: unique symbol
