# silk

Silk is an embedded DSL for authoring HTML from TypeScript. You write simple
typed [JSX][jsx] and Silk generates [`ReadableStream`s][readable-stream] of
[`HTMLToken`s][html-tokens]. You can [get Silk from npm][npm-package].

Child nodes and attributes can be async values or streams.

Here's an example:

```tsx
import { createElement } from '@matt.kantor/silk'

const document = (
  <html lang="en">
    <head>
      <title>Greeting</title>
    </head>
    <body>Hello, {slowlyGetPlanet()}!</body>
  </html>
)

const slowlyGetPlanet = (): Promise<ReadableHTMLTokenStream> =>
  new Promise(resolve =>
    setTimeout(() => resolve(<strong>world</strong>), 2000),
  )
```

The HTML structure and content before the `slowlyGetPlanet` call will
immediately be readable from the `document` stream, while the rest will appear
as soon as the `Promise` returned by `slowlyGetPlanet` resolves.

## Setup

To use Silk, add these options to your `tsconfig.json`[^1]:
```json
"jsx": "react",
"jsxFactory": "createElement",
"jsxFragmentFactory": "createElement",
```

Also, add `import { createElement } from '@matt.kantor/silk'` to each of your
`.tsx` files.

## Server-Side Usage

If you're using Silk for server-side rendering and want a stream that you can
pipe out as the HTTP response, `HTMLSerializingTransformStream` has you covered.
Here's a complete HTTP server which uses Silk to serve a web page:

```tsx
import { createServer } from 'node:http'
import { Writable } from 'node:stream'
import {
  type ReadableHTMLTokenStream,
  createElement,
  HTMLSerializingTransformStream,
} from '@matt.kantor/silk'

const port = 80

createServer(async (_request, response) => {
  const document = (
    <html lang="en">
      <head>
        <title>Greeting</title>
      </head>
      <body>Hello, {slowlyGetPlanet()}!</body>
    </html>
  )
  const serializeHTML = new HTMLSerializingTransformStream({
    includeDoctype: true,
  })

  response.setHeader('Content-Type', 'text/html; charset=utf-8')
  try {
    await document.pipeThrough(serializeHTML).pipeTo(Writable.toWeb(response))
  } catch (error) {
    console.error('Error while writing response:', error)
  }
}).listen(port)

const slowlyGetPlanet = (): Promise<ReadableHTMLTokenStream> =>
  new Promise(resolve =>
    setTimeout(() => resolve(<strong>world</strong>), 2000),
  )
```

If you run that and make a request to it from a web browser, you'll see "Hello,
" appear quickly, then "world!" appear after two seconds. You can [try it out on
StackBlitz][silk-example-server-stackblitz].

[^1]: `"jsx": "react"` may seem odd because Silk isn't related to React, but
TypeScript's JSX configuration is based around React's semantics.

[jsx]: https://facebook.github.io/jsx/
[readable-stream]: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream
[mdn]: https://developer.mozilla.org/
[html-tokens]: ./src/htmlToken.ts
[npm-package]: https://www.npmjs.com/package/@matt.kantor/silk
[silk-example-server-stackblitz]: https://stackblitz.com/edit/silk-example-server?file=src%2Findex.tsx
