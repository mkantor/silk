import { ReadableStream } from 'web-streams-polyfill'
import { stringifyAttributes, type AttributesByTagName } from './attributes.js'
import { makeHTMLEscapingTransformStream } from './escaping.js'
import { concatReadableStreams } from './readableStream.js'
import {
  isVoidElementTagName,
  type VoidElementTagName,
} from './voidElements.js'

export type PossiblyDeferredHTML =
  | string
  | (Promise<string> & PossiblyTrusted)
  | (AsyncIterable<string> & PossiblyTrusted)

export type ReadableHTMLStream = ReadableStream<string> & PossiblyTrusted

/**
 * Children where `child[trusted] === true` are considered safe to emit without
 * escaping.
 */
export const trusted = Symbol('trusted')

/**
 * Creates an HTML element from the given tag name, attributes, and children,
 * returning a `ReadableStream`. Children may be supplied asynchronously as
 * `Promise`s and/or async iterables.
 *
 * Attribute values and content are escaped via HTML entity encoding, except for
 * children with a `trusted` symbol property set to `true`.
 */
export const createElement: (
  ...[tagName, attributes, ...children]: CreateElementParameters
) => ReadableHTMLStream = (
  // This function gets called for fragments too. Direct callers of
  // `createElement` shouldn't have to see the function parameter, so the
  // externally-visible type above excludes `CreateFragmentParameters`.
  ...[tagNameOrFragmentFunction, attributes, ...children]:
    | CreateElementParameters
    | CreateFragmentParameters
) => {
  let stream: ReadableHTMLStream

  if (typeof tagNameOrFragmentFunction === 'function') {
    stream = concatReadableStreams(children.map(escapeAsNeeded))
  } else {
    const stringifiedAttributes =
      attributes === null ? '' : stringifyAttributes(attributes)

    stream = isVoidElementTagName(tagNameOrFragmentFunction)
      ? ReadableStream.from([
          '<'.concat(tagNameOrFragmentFunction, stringifiedAttributes, '>'),
        ])
      : concatReadableStreams([
          ReadableStream.from([
            '<'.concat(tagNameOrFragmentFunction, stringifiedAttributes, '>'),
          ]),
          ...children.map(escapeAsNeeded),
          ReadableStream.from(['</'.concat(tagNameOrFragmentFunction, '>')]),
        ])
  }

  stream[trusted] = true // Escaping has occurred.

  return stream
}

type CreateElementParameters =
  | {
      [TagName in keyof AttributesByTagName]: readonly [
        tagName: TagName,
        attributes: AttributesByTagName[TagName] | null,
        ...children: TagName extends VoidElementTagName
          ? readonly []
          : readonly PossiblyDeferredHTML[],
      ]
    }[keyof AttributesByTagName]

type CreateFragmentParameters = readonly [
  // With standard configuration this will be `createElement` itself.
  component: (...parameters: never) => unknown,
  attributes: null,
  ...children: readonly PossiblyDeferredHTML[],
]

type PossiblyTrusted = { [trusted]?: true }

const escapeAsNeeded = (element: PossiblyDeferredHTML): ReadableHTMLStream => {
  const stream = elementAsReadableStream(element)

  const elementIsTrusted =
    typeof element === 'object' &&
    trusted in element &&
    element[trusted] === true

  return elementIsTrusted
    ? stream
    : stream.pipeThrough(makeHTMLEscapingTransformStream())
}

const elementAsReadableStream = (
  element: PossiblyDeferredHTML,
): ReadableHTMLStream =>
  new ReadableStream({
    start: async controller => {
      try {
        const awaitedElement = await element
        if (typeof awaitedElement === 'string') {
          controller.enqueue(awaitedElement)
        } else {
          for await (const value of awaitedElement) {
            controller.enqueue(value)
          }
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })
