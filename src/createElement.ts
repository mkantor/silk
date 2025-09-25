import { ReadableStream } from 'web-streams-polyfill'
import {
  possiblyDeferredAttributesToHTMLTokenStream,
  type PossiblyDeferredAttributesByTagName,
} from './attributes.js'
import type { HTMLToken } from './htmlToken.js'
import { concatReadableStreams } from './readableStream.js'
import type { TagName } from './tagName.js'
import { TextCapturingTransformStream } from './transformStreams.js'
import type { VoidElementTagName } from './voidElements.js'

export type ReadableHTMLTokenStream = ReadableStream<HTMLToken>

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
) => ReadableHTMLTokenStream = (
  // This function gets called for fragments too. Direct callers of
  // `createElement` shouldn't have to see the function parameter, so the
  // externally-visible type above excludes `CreateFragmentParameters`.
  ...[tagNameOrFragmentFunction, attributes, ...children]:
    | CreateElementParameters
    | CreateFragmentParameters
) => {
  const childrenAsStreams = children.map(child =>
    isReadonlyArray(child)
      ? concatReadableStreams(child.map(childToReadableHTMLTokenStream))
      : childToReadableHTMLTokenStream(child),
  )

  const streamComponents =
    typeof tagNameOrFragmentFunction === 'function'
      ? // This is a fragment.
        childrenAsStreams
      : // This is an intrinsic element.
        ([
          ReadableStream.from([
            { kind: 'startOfOpeningTag', tagName: tagNameOrFragmentFunction },
          ]),
          possiblyDeferredAttributesToHTMLTokenStream(attributes ?? {}),
          ReadableStream.from([{ kind: 'endOfOpeningTag' }]),

          ...childrenAsStreams,

          ReadableStream.from([{ kind: 'closingTag' }]),
        ] satisfies readonly ReadableHTMLTokenStream[])

  return concatReadableStreams(streamComponents)
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
  | Promise<string>
  | AsyncIterable<string>
  | AsyncIterable<HTMLToken>

const childToReadableHTMLTokenStream = (
  child: Child,
): ReadableHTMLTokenStream =>
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
  }).pipeThrough(new TextCapturingTransformStream())

const isReadonlyArray: (value: unknown) => value is readonly unknown[] =
  Array.isArray
