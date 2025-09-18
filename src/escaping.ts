import * as htmlEntities from 'html-entities'
import { TransformStream } from 'web-streams-polyfill'

export const escapeHTMLContent = (content: string): string =>
  htmlEntities.encode(content, {
    mode: 'specialChars',
    level: 'html5',
    numeric: 'hexadecimal',
  })

export const makeHTMLEscapingTransformStream = (): TransformStream<
  string,
  string
> =>
  new TransformStream({
    transform: (chunk, controller) =>
      controller.enqueue(escapeHTMLContent(chunk)),
  })
