import {
  attributesToReadableStream,
  type AttributesByTagName,
} from './attributes.js'
import type { HTMLToken } from './htmlToken.js'
import { ReadableHTMLStream } from './readableHTMLStream.js'
import {
  concatReadableStreams,
  readableStreamFromChunk,
  readableStreamFromIterable,
  readableStreamFromPromise,
} from './readableStream.js'
import type { TagName } from './tagName.js'
import { TextCapturingTransformStream } from './transformStreams.js'
import type { VoidElementTagName } from './voidElements.js'

/** The type of the `...children` rest parameter of `createElement`. */
export type Children<SpecificTagName extends TagName> =
  SpecificTagName extends VoidElementTagName
    ? readonly []
    : readonly (Child | readonly Child[])[]

export const createElement = (
  // This function gets called for fragments too.
  ...[tagNameOrFragmentFunction, attributes, ...children]:
    | CreateElementParameters
    | CreateFragmentParameters
) => {
  const childrenAsStreams = children.map(child =>
    isReadonlyArray(child)
      ? concatReadableStreams(child.map(childToReadableStream))
      : childToReadableStream(child),
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
          attributesToReadableStream(attributes ?? {}),
          readableStreamFromChunk({ kind: 'endOfOpeningTag' }),

          ...childrenAsStreams,

          readableStreamFromChunk({ kind: 'closingTag' }),
        ] satisfies readonly ReadableStream<HTMLToken>[])

  return ReadableHTMLStream.fromConcatenatedReadableStreams(streamComponents)
}

export type CreateElementParameters =
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
  | Promise<string | ReadableStream<string> | ReadableStream<HTMLToken>>
  | AsyncIterable<string>
  | ReadableStream<HTMLToken>

const childToReadableStream = (child: Child): ReadableStream<HTMLToken> => {
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
