// Run: node tests/ui/disclose.test.mjs
import assert from "node:assert/strict";
import { disclose, rememberOpen, isRemembered, installDisclose } from "../../evals-lab/src/ui/disclose.js";

let n = 0;
const ok = (name, fn) => {
  fn();
  n += 1;
  console.log(`ok  ${name}`);
};

ok("summary text is escaped, body markup is kept", () => {
  const html = disclose('Why <b>&"?', "<p>Trusted <i>markup</i></p>");
  assert.match(html, /<summary>Why &lt;b&gt;&amp;&quot;\?<\/summary>/);
  assert.ok(!html.includes("<b>&"));
  assert.ok(html.includes("<p>Trusted <i>markup</i></p>"));
  assert.match(html, /^<details class="disclose"/);
});

ok("closed by default, open flag opens it", () => {
  assert.ok(!/ open[ >]/.test(disclose("A", "x")));
  assert.match(disclose("A", "x", { open: true }), /<details [^>]* open>/);
});

ok("id is escaped into data-did; no id means no attribute", () => {
  assert.match(disclose("A", "x", { id: 'a"b' }), /data-did="a&quot;b"/);
  assert.ok(!disclose("A", "x").includes("data-did"));
});

ok("an id remembered as open re-opens on the next render, until it is closed", () => {
  assert.ok(!/ open[ >]/.test(disclose("A", "x", { id: "run-time" })));
  rememberOpen("run-time", true);
  assert.ok(isRemembered("run-time"));
  assert.match(disclose("A", "x", { id: "run-time" }), /data-did="run-time" open>/);
  assert.ok(!/ open[ >]/.test(disclose("A", "x", { id: "other" })));
  rememberOpen("run-time", false);
  assert.ok(!/ open[ >]/.test(disclose("A", "x", { id: "run-time" })));
});

ok("installDisclose listens for toggle in the capture phase and updates the remembered ids", () => {
  const calls = [];
  const doc = { addEventListener: (type, fn, capture) => calls.push({ type, fn, capture }) };
  installDisclose(doc);
  assert.equal(calls.length, 1);
  assert.deepEqual([calls[0].type, calls[0].capture], ["toggle", true]);
  const fire = (d) => calls[0].fn({ target: d });
  fire({ tagName: "DETAILS", dataset: { did: "t1" }, open: true });
  assert.ok(isRemembered("t1"));
  fire({ tagName: "DETAILS", dataset: { did: "t1" }, open: false });
  assert.ok(!isRemembered("t1"));
  fire({ tagName: "DETAILS", dataset: {}, open: true }); // no id: ignored
  fire({ tagName: "DIV", dataset: { did: "t2" }, open: true }); // not a details: ignored
  assert.ok(!isRemembered("t2"));
});

console.log(`${n} checks passed`);
