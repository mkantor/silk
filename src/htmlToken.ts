import type { TagName } from './tagName.js'

export type HTMLToken =
  | {
      readonly kind: 'text'
      readonly text: string
    }
  | {
      readonly kind: 'startOfOpeningTag'
      readonly tagName: TagName
    }
  | {
      readonly kind: 'attribute'
      readonly name: string
      readonly value: string
    }
  | {
      readonly kind: 'endOfOpeningTag'
    }
  | {
      readonly kind: 'closingTag'
    }
