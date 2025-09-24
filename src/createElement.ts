import { ReadableStream } from 'web-streams-polyfill'
import {
  stringifyAttributes,
  type AttributesByTagName,
  type TagName,
} from './attributes.js'
import { makeHTMLEscapingTransformStream } from './escaping.js'
import { concatReadableStreams } from './readableStream.js'
import { trusted, type PossiblyTrusted } from './trust.js'
import {
  isVoidElementTagName,
  type VoidElementTagName,
} from './voidElements.js'

export type PossiblyDeferredHTML =
  | string
  | (Promise<string> & PossiblyTrusted)
  | (AsyncIterable<string> & PossiblyTrusted)

export type ReadableHTMLStream = ReadableStream<string> & PossiblyTrusted

/** The type of the `...children` rest parameter of `createElement`. */
export type Children<SpecificTagName extends TagName> =
  SpecificTagName extends VoidElementTagName
    ? readonly []
    : readonly (PossiblyDeferredHTML | readonly PossiblyDeferredHTML[])[]

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
    // This is a fragment.
    stream = concatReadableStreams(
      children.map(child =>
        isReadonlyArray(child)
          ? concatReadableStreams(child.map(escapeAsNeeded))
          : escapeAsNeeded(child),
      ),
    )
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
          ...children.map(child =>
            isReadonlyArray(child)
              ? concatReadableStreams(child.map(escapeAsNeeded))
              : escapeAsNeeded(child),
          ),
          ReadableStream.from(['</'.concat(tagNameOrFragmentFunction, '>')]),
        ])
  }

  stream[trusted] = true // Escaping has occurred.

  return stream
}

type CreateElementParameters =
  | {
      [SpecificTagName in TagName]: readonly [
        tagName: SpecificTagName,
        attributes: AttributesByTagName[SpecificTagName] | null,
        ...children: Children<SpecificTagName>,
      ]
    }[keyof AttributesByTagName]

type CreateFragmentParameters = readonly [
  // With standard configuration this will be `createElement` itself.
  component: (...parameters: never) => unknown,
  attributes: null,
  ...children: readonly PossiblyDeferredHTML[],
]

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

const isReadonlyArray: (value: unknown) => value is readonly unknown[] =
  Array.isArray
