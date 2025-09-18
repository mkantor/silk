import assert from 'node:assert'
import test, { suite } from 'node:test'
import { isVoidElementTagName } from './voidElements.js'

suite('void elements', _ => {
  test('br', _ => assert(isVoidElementTagName('br')))

  test('img', _ => assert(isVoidElementTagName('img')))

  test('wbr', _ => assert(isVoidElementTagName('wbr')))

  test('div', _ => assert(!isVoidElementTagName('div')))

  test('html', _ => assert(!isVoidElementTagName('html')))
})
