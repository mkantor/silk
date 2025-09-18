import { voidHtmlTags, type VoidHtmlTags } from 'html-tags'
import type { AttributesByTagName } from './attributes.js'

export type VoidElementTagName = VoidHtmlTags

export const isVoidElementTagName = (
  tagName: TagName,
): tagName is VoidElementTagName => voidTagNamesAsSet.has(tagName)

type TagName = keyof AttributesByTagName

const voidTagNamesAsSet = new Set<TagName>(voidHtmlTags)
