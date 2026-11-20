// Run: node tests/ui/node-visuals.test.mjs
import assert from "node:assert/strict";
import { test } from "node:test";
import { NODE_IDS } from "../../evals-lab/src/ui/wiring-graph.js";
import { nodeVisualHtml, flowStripHtml, VISUAL_IDS } from "../../evals-lab/src/ui/node-visuals.js";
import { MORE_EXPLAIN } from "../../evals-lab/src/ui/explainers-more.js";

const nodeIds = [...new Set([...NODE_IDS.careful, ...NODE_IDS.simple])];
// Wiring nodes, plus the 8 checks and the 5 diagram boxes (explainers-more.js).
const allIds = [...nodeIds, ...Object.keys(MORE_EXPLAIN)];

test("every node, check and diagram box id has a visual, and nothing else does", () => {
  assert.deepEqual([...VISUAL_IDS].sort(), [...allIds].sort());
});

test("each visual is an aria-hidden svg with a visible text caption below it", () => {
  for (const id of allIds) {
    const h = nodeVisualHtml(id);
    assert.match(h, /<svg [^>]*viewBox="0 0 64 64"[^>]*aria-hidden="true"/, id);
    assert.match(h, /stroke="currentColor"/, id);
    assert.match(h, /stroke-width="2"/, id);
    assert.ok(!/gradient|filter|shadow/i.test(h), `${id}: flat, no gradient or shadow`);
    const cap = /<\/svg><figcaption>([^<]+)<\/figcaption>/.exec(h);
    assert.ok(cap && cap[1].trim().length > 3, `${id}: caption after the svg`);
  }
});

test("a missing step gets the dashed class; an unknown id gets nothing", () => {
  assert.match(nodeVisualHtml("guard", { missing: true }), /class="xvis xvis-missing"/);
  assert.match(nodeVisualHtml("guard"), /class="xvis"/);
  assert.equal(nodeVisualHtml("nope"), "");
  assert.equal(nodeVisualHtml("constructor"), "");
});

test("flow strip: IN and OUT as text, values escaped, a missing value reads none", () => {
  const h = flowStripHtml('{"a":"<b>"}', undefined);
  assert.ok(h.includes("IN") && h.includes("OUT"));
  assert.ok(h.includes("&lt;b&gt;") && !h.includes("<b>"));
  assert.ok(h.includes("<code>none</code>"));
});
