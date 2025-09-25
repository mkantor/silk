import { voidHtmlTags, type VoidHtmlTags } from 'html-tags'
import type { TagName } from './tagName.js'

export type VoidElementTagName = VoidHtmlTags

export const isVoidElementTagName = (
  tagName: TagName,
): tagName is VoidElementTagName => voidTagNamesAsSet.has(tagName)

const voidTagNamesAsSet = new Set<TagName>(voidHtmlTags)
