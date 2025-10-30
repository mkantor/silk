import {
  attributesToReadableHTMLStream,
  type AttributesByTagName,
} from './attributes.js'
import type { HTMLToken } from './htmlToken.js'
import {
  concatReadableStreams,
  readableStreamFromChunk,
  readableStreamFromIterable,
  readableStreamFromPromise,
} from './readableStream.js'
import type { TagName } from './tagName.js'
import { TextCapturingTransformStream } from './transformStreams.js'
import type { VoidElementTagName } from './voidElements.js'

export type ReadableHTMLStream = ReadableStream<HTMLToken>

/** @deprecated use `ReadableHTMLStream` instead */
export type ReadableHTMLTokenStream = ReadableHTMLStream

/** The type of the `...children` rest parameter of `createElement`. */
export type Children<SpecificTagName extends TagName> =
  SpecificTagName extends VoidElementTagName
    ? readonly []
    : readonly (Child | readonly Child[])[]

/**
 * Creates an HTML element from the given tag name, attributes, and children,
 * returning a `ReadableStream`. Children may be supplied asynchronously as
 * `Promise`s and/or async iterables.
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
  const childrenAsStreams = children.map(child =>
    isReadonlyArray(child)
      ? concatReadableStreams(child.map(childToReadableHTMLStream))
      : childToReadableHTMLStream(child),
  )

  const streamComponents =
    typeof tagNameOrFragmentFunction === 'function'
      ? // This is a fragment.
        childrenAsStreams
      : // This is an intrinsic element.
        ([
          readableStreamFromChunk({
            kind: 'startOfOpeningTag',
            tagName: tagNameOrFragmentFunction,
          }),
          attributesToReadableHTMLStream(attributes ?? {}),
          readableStreamFromChunk({ kind: 'endOfOpeningTag' }),

          ...childrenAsStreams,

          readableStreamFromChunk({ kind: 'closingTag' }),
        ] satisfies readonly ReadableHTMLStream[])

  return concatReadableStreams(streamComponents)
}

type CreateElementParameters =
  | {
      readonly [SpecificTagName in TagName]: readonly [
        tagName: SpecificTagName,
        attributes: AttributesByTagName[SpecificTagName] | null,
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
  | Promise<string | ReadableStream<string> | ReadableHTMLStream>
  | AsyncIterable<string>
  | ReadableHTMLStream

const childToReadableHTMLStream = (child: Child): ReadableHTMLStream => {
  let stream =
    typeof child === 'object' && Symbol.asyncIterator in child
      ? readableStreamFromIterable<HTMLToken | string>(child)
      : typeof child === 'string'
      ? readableStreamFromChunk(child)
      : readableStreamFromPromise<HTMLToken | string>(child)

  return stream.pipeThrough(new TextCapturingTransformStream())
}

const isReadonlyArray: (value: unknown) => value is readonly unknown[] =
  Array.isArray
