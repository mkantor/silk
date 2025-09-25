import { ReadableStream } from 'web-streams-polyfill'
import {
  stringifyPossiblyDeferredAttributes,
  type PossiblyDeferredAttributesByTagName,
} from './attributes.js'
import { makeHTMLEscapingTransformStream } from './escaping.js'
import { concatReadableStreams } from './readableStream.js'
import type { TagName } from './tagName.js'
import { trusted, type PossiblyTrusted } from './trust.js'
import {
  isVoidElementTagName,
  type VoidElementTagName,
} from './voidElements.js'

export type ReadableHTMLStream = ReadableStream<string> & PossiblyTrusted

/** The type of the `...children` rest parameter of `createElement`. */
export type Children<SpecificTagName extends TagName> =
  SpecificTagName extends VoidElementTagName
    ? readonly []
    : readonly (Child | readonly Child[])[]

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
    const openingTag = concatReadableStreams([
      ReadableStream.from(['<'.concat(tagNameOrFragmentFunction)]),
      stringifyPossiblyDeferredAttributes(attributes ?? {}),
      ReadableStream.from(['>']),
    ])

    stream = isVoidElementTagName(tagNameOrFragmentFunction)
      ? openingTag
      : concatReadableStreams([
          openingTag,
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
      readonly [SpecificTagName in TagName]: readonly [
        tagName: SpecificTagName,
        attributes: PossiblyDeferredAttributesByTagName[SpecificTagName] | null,
        ...children: Children<SpecificTagName>,
      ]
    }[TagName]

type CreateFragmentParameters = readonly [
  // With standard configuration this will be `createElement` itself.
  component: (...parameters: never) => unknown,
  attributes: null,
  ...children: readonly (Child | readonly Child[])[],
]

type Child =
  | string
  | (Promise<string> & PossiblyTrusted)
  | (AsyncIterable<string> & PossiblyTrusted)

const escapeAsNeeded = (child: Child): ReadableHTMLStream => {
  const stream = childAsReadableStream(child)

  const childIsTrusted =
    typeof child === 'object' && trusted in child && child[trusted] === true

  return childIsTrusted
    ? stream
    : stream.pipeThrough(makeHTMLEscapingTransformStream())
}

const childAsReadableStream = (child: Child): ReadableHTMLStream =>
  new ReadableStream({
    start: async controller => {
      try {
        const awaitedChild = await child
        if (
          typeof awaitedChild === 'object' &&
          Symbol.asyncIterator in awaitedChild
        ) {
          for await (const value of awaitedChild) {
            controller.enqueue(value)
          }
        } else {
          controller.enqueue(awaitedChild)
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
  })

const isReadonlyArray: (value: unknown) => value is readonly unknown[] =
  Array.isArray
