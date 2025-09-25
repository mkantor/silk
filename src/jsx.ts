import type { PossiblyDeferredAttributesByTagName } from './attributes.js'
import type { Children, ReadableHTMLTokenStream } from './createElement.js'
import type { TagName } from './tagName.js'

export { createElement } from './createElement.js'

// See <https://www.typescriptlang.org/docs/handbook/jsx.html>.
export declare namespace createElement.JSX {
  // This type alias exists to improve type info for JSX tags.
  type HTML<SpecificTagName extends TagName> =
    PossiblyDeferredAttributesByTagName[SpecificTagName] & {
      // This results in void elements having `never` for `_children`.
      readonly [_children]?: Children<SpecificTagName>[number]
    }

  type IntrinsicElements = {
    readonly [SpecificTagName in TagName]: HTML<SpecificTagName>
  }

  type ElementChildrenAttribute = {
    readonly [_children]: unknown // Only the property name matters.
  }

  /** There are no function/class components, just intrinsic elements. */
  type ElementType = keyof IntrinsicElements

  type Element = ReadableHTMLTokenStream

  type ElementClass = never
}

// This is only used for typing element children. It never exists at runtime.
declare const _children: unique symbol
