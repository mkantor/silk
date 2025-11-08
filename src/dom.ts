import type { ReadableHTMLStream } from './createElement.js'

/**
 * Reads `HTMLToken`s from `htmlStream` and uses them to update the DOM tree
 * rooted at `container`.
 */
export const consumeAsDOMChildren = async (
  container: ElementLike,
  htmlStream: ReadableHTMLStream,
): Promise<undefined> => {
  let currentElement = container
  for await (const token of htmlStream) {
    switch (token.kind) {
      case 'text': {
        currentElement.append(token.text)
        break
      }
      case 'startOfOpeningTag': {
        const newElement = currentElement.ownerDocument.createElement(
          token.tagName,
        )
        currentElement.append(newElement)
        currentElement = newElement
        break
      }
      case 'attribute': {
        currentElement.setAttribute(token.name, token.value)
        break
      }
      case 'endOfOpeningTag': {
        // no-op
        break
      }
      case 'closingTag': {
        const parentElement = currentElement.parentElement
        if (parentElement === null) {
          throw new Error('Parent element does not exist')
        }
        currentElement = parentElement
        break
      }
    }
  }
}

// To avoid pulling in global DOM types (which could be problematic for
// server-side usage), the necessary subset of the `Element` API is re-specified
// here.
type ElementLike = {
  readonly ownerDocument: {
    readonly createElement: (tagName: string) => ElementLike
  }
  readonly setAttribute: (name: string, value: string) => void
  readonly parentElement: ElementLike | null

  // Method syntax (with unsafely-bivariant parameter types) is used here
  // because otherwise the entire `Node` API (and all of its related types)
  // would need to be re-specified. In order for a real `Element` to be truly
  // safely assignable to `ElementLike`, its `append` parameter list (which
  // mentions `Node`) needs to be a *supertype* of this parameter list.
  //
  // While this is not strictly safe/correct, you'd have to go far out of your
  // way to intentionally break things for problems to arise.
  append(...nodes: readonly (NodeLike | string)[]): void
}

// Only a common supertype of `ElementLike` and `Node` is necessary here:
type NodeLike = Pick<ElementLike, 'parentElement'>
