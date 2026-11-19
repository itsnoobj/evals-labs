import assert from 'node:assert/strict';
import { STAGE_TOOLS, toolsHtml } from './stage-tools.js';
import { NODE_IDS } from './wiring-graph.js';
import { STAGES } from './lessons.js';

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n++; };

const ids = new Set([...NODE_IDS.careful, ...NODE_IDS.simple, ...STAGES.map((s) => s.id), 'guard', 'guard_out']);

for (const id of ids) {
  const tools = STAGE_TOOLS[id];
  ok(Array.isArray(tools), `${id}: missing`);
  ok(tools.length >= 2 && tools.length <= 4, `${id}: needs 2 to 4 tools, has ${tools.length}`);
  ok(new Set(tools.map((t) => t.url)).size === tools.length, `${id}: duplicate url`);
  for (const t of tools) {
    ok(t.name && t.url.startsWith('https://'), `${id}/${t.name}: bad name or url`);
    ok(t.what && t.what.length < 90 && !t.what.includes('\n'), `${id}/${t.name}: 'what' must be one line under 90 chars`);
  }
  const html = toolsHtml(id);
  ok(html.startsWith('<details class="stage-tools">') && html.includes(`(${tools.length})</summary>`), `${id}: html shape`);
  ok((html.match(/<li>/g) || []).length === tools.length, `${id}: li count`);
  ok(html.includes('target="_blank" rel="noopener noreferrer"'), `${id}: link attrs`);
}

ok(toolsHtml('nope') === '', 'unknown id gives empty string');
ok(toolsHtml('__proto__') === '' && toolsHtml('toString') === '', 'prototype names give empty string');

// escaping: temporarily inject a hostile entry
STAGE_TOOLS.evil = [{ name: '<b>x</b>', url: 'https://a.test/?q="1"&r=<2>', what: `it's <i>bad</i>` }];
const evil = toolsHtml('evil');
delete STAGE_TOOLS.evil;
ok(!evil.includes('<b>') && !evil.includes('<i>') && !evil.includes('"1"'), 'toolsHtml escapes name, what and url');
ok(evil.includes('&lt;b&gt;x&lt;/b&gt;') && evil.includes('&quot;1&quot;&amp;r=&lt;2&gt;') && evil.includes('it&#39;s'), 'escaped forms present');

console.log(`${n} checks passed`);
