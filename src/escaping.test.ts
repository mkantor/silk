import assert from 'node:assert'
import test, { suite } from 'node:test'
import { escapeHTMLContent } from './escaping.js'

suite('escaping', _ => {
  test('text without special characters is not escaped', _ =>
    assert.deepEqual(escapeHTMLContent('test'), 'test'))

  test('text with special characters is escaped', _ =>
    assert.deepEqual(
      escapeHTMLContent('<script>true && alert("hacked!")</script>'),
      '&lt;script&gt;true &amp;&amp; alert(&quot;hacked!&quot;)&lt;/script&gt;',
    ))
})
