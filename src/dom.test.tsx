import assert from 'node:assert'
import test, { suite } from 'node:test'
import { consumeAsDOMChildren } from './dom.js'
import { createElement } from './jsx.js'

suite('dom', _ => {
  test('empty fragment', async _ => {
    const container = createMockElement('root')
    await consumeAsDOMChildren(container, <></>)
    assert.partialDeepStrictEqual(container, {
      parentElement: null,
      tagName: 'root',
      attributes: new Map(),
      content: [],
    })
  })

  test('non-empty fragment', async _ => {
    const container = createMockElement('root')
    await consumeAsDOMChildren(
      container,
      <>
        Hello, <strong>world</strong>!
      </>,
    )
    assert.partialDeepStrictEqual(container, {
      parentElement: null,
      tagName: 'root',
      attributes: new Map(),
      content: [
        'Hello, ',
        {
          parentElement: { tagName: 'root' },
          tagName: 'strong',
          attributes: new Map(),
          content: ['world'],
        },
        '!',
      ],
    })
  })

  test('empty element', async _ => {
    const container = createMockElement('root')
    await consumeAsDOMChildren(container, <div id="test"></div>)
    assert.partialDeepStrictEqual(container, {
      parentElement: null,
      tagName: 'root',
      attributes: new Map(),
      content: [
        {
          parentElement: { tagName: 'root' },
          tagName: 'div',
          attributes: new Map([['id', 'test']]),
          content: [],
        },
      ],
    })
  })

  test('non-empty element', async _ => {
    const container = createMockElement('root')
    await consumeAsDOMChildren(
      container,
      <div id="test">
        <h1>title</h1>
        <p class="classy">text</p>
      </div>,
    )
    assert.partialDeepStrictEqual(container, {
      parentElement: null,
      tagName: 'root',
      attributes: new Map(),
      content: [
        {
          parentElement: { tagName: 'root' },
          tagName: 'div',
          attributes: new Map([['id', 'test']]),
          content: [
            {
              parentElement: { tagName: 'div' },
              tagName: 'h1',
              attributes: new Map(),
              content: ['title'],
            },
            {
              parentElement: { tagName: 'div' },
              tagName: 'p',
              attributes: new Map([['class', 'classy']]),
              content: ['text'],
            },
          ],
        },
      ],
    })
  })
})

type MockElement = {
  tagName: string
  attributes: Map<string, string>
  content: (string | MockElement)[]
  parentElement: MockElement | null
  readonly ownerDocument: {
    readonly createElement: (tagName: string) => MockElement
  }
  readonly setAttribute: (name: string, value: string) => void
  readonly append: (...nodes: readonly (MockElement | string)[]) => void
}

const createMockElement = (tagName: string): MockElement => ({
  tagName,
  attributes: new Map(),
  content: [],
  parentElement: null,
  ownerDocument: { createElement: createMockElement },
  setAttribute(name, value) {
    this.attributes.set(name, value)
  },
  append(...nodes) {
    for (const node of nodes) {
      if (typeof node !== 'string') {
        node.parentElement = this
      }
      this.content.push(node)
    }
  },
})
