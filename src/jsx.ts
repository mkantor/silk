import type { PossiblyDeferredAttributesByTagName } from './attributes.js'
import type {
  Children as CreateElementChildren,
  ReadableHTMLTokenStream,
} from './createElement.js'
import type { TagName } from './tagName.js'

export { createElement } from './createElement.js'

// See <https://www.typescriptlang.org/docs/handbook/jsx.html>.
export declare namespace createElement.JSX {
  // This type alias exists to improve type info for JSX tags.
  type HTML<SpecificTagName extends TagName> =
    PossiblyDeferredAttributesByTagName[SpecificTagName] & {
      // This results in void elements having `never` for `_children`.
      readonly [_children]?: CreateElementChildren<SpecificTagName>[number]
    }

  type IntrinsicElements = {
    readonly [SpecificTagName in TagName]: HTML<SpecificTagName>
  }

  type ElementChildrenAttribute = {
    // Only the property name actually matters here, but the value is
    // instructive.
    readonly [_children]: Children
  }

  // There are no function/class components, just intrinsic elements.
  type ElementType = keyof IntrinsicElements

  /** The type that JSX nodes evaluate to. */
  type Element = ReadableHTMLTokenStream

  type ElementClass = never

  /** Types acceptable as children of non-void JSX nodes. */
  // This is not among the special JSX types used by TypeScript, but is handy
  // for users.
  type Children = CreateElementChildren<TagName>[number]
}

// This is only used for typing element children. It never exists at runtime.
declare const _children: unique symbol
