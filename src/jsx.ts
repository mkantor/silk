import { type AttributesByTagName } from './attributes.js'
import type { PossiblyDeferredHTML } from './createElement.js'
import { type VoidElementTagName } from './voidElements.js'

export { createElement } from './createElement.js'

// See <https://www.typescriptlang.org/docs/handbook/jsx.html>.
export declare namespace createElement.JSX {
  type IntrinsicElements = {
    [TagName in keyof AttributesByTagName]: AttributesByTagName[TagName] & {
      readonly [_children]?: TagName extends VoidElementTagName
        ? undefined
        : Element | readonly Element[]
    }
  }

  type ElementChildrenAttribute = {
    readonly [_children]: unknown // Only the property name matters.
  }

  /** There are no function/class components, just intrinsic elements. */
  type ElementType = keyof IntrinsicElements

  type Element = PossiblyDeferredHTML

  type ElementClass = never
}

// This is only used for typing element children. It never exists at runtime.
declare const _children: unique symbol
