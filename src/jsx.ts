import type { AttributesByTagName } from './attributes.js'
import type {
  Children as CreateElementChildren,
  CreateElementParameters,
} from './createElement.js'
import type { ReadableHTMLStream } from './readableHTMLStream.js'
import type { TagName } from './tagName.js'

import { createElement as internalCreateElement } from './createElement.js'

/**
 * Creates an HTML element from the given tag name, attributes, and children,
 * returning a `ReadableStream`. Children may be supplied asynchronously as
 * `Promise`s and/or async iterables.
 */
// Unfortunately a `function` declaration is needed for declaration merging to
// work.
export function createElement(
  ...parameters: CreateElementParameters
): ReadableHTMLStream {
  return internalCreateElement(...parameters)
}

// See <https://www.typescriptlang.org/docs/handbook/jsx.html>.
export namespace createElement {
  // Necessary for strict typing of fragment children.
  export declare const Fragment: (props: {
    readonly [_children]?: JSX.Children
  }) => void

  export declare namespace JSX {
    // This type alias exists to improve type info for JSX tags.
    type HTML<SpecificTagName extends TagName> =
      AttributesByTagName[SpecificTagName] & {
        // This results in void elements having `never` for `_children`.
        readonly [_children]?: CreateElementChildren<SpecificTagName>[number]
      }

    type IntrinsicElements = {
      // Using `keyof AttributesByTagName` rather than `TagName` here is
      // necessary to maintain documentation in type info.
      readonly [SpecificTagName in keyof AttributesByTagName]: HTML<SpecificTagName>
    }

    type ElementChildrenAttribute = {
      // Only the property name actually matters here, but the value is
      // instructive.
      readonly [_children]: Children
    }

    // There are no function/class components, just intrinsic elements.
    type ElementType = keyof IntrinsicElements

    /** The type that JSX nodes evaluate to. */
    type Element = ReadableHTMLStream

    type ElementClass = never

    /** Types acceptable as children of non-void JSX nodes. */
    // This is not among the special JSX types used by TypeScript, but is handy
    // for users.
    type Children = CreateElementChildren<TagName>[number]
  }
}

// This is only used for typing element children. It never exists at runtime.
declare const _children: unique symbol
