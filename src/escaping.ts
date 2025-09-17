import * as htmlEntities from 'html-entities'

export const escapeHTMLContent = (content: string): string =>
  htmlEntities.encode(content, {
    mode: 'specialChars',
    level: 'html5',
    numeric: 'hexadecimal',
  })
