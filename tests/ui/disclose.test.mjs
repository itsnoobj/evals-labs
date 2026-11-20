// Run: node tests/ui/disclose.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

ok("cls adds class names after disclose", () => {
  assert.match(disclose("A", "x", { cls: "wlane wl-live" }), /^<details class="disclose wlane wl-live">/);
});

ok("a closed id stays closed even when the section is open by default; opening it again undoes that", () => {
  assert.match(disclose("A", "x", { open: true, id: "phase" }), /data-did="phase" open>/);
  rememberOpen("phase", false);
  assert.ok(!/ open[ >]/.test(disclose("A", "x", { open: true, id: "phase" })));
  rememberOpen("phase", true);
  assert.match(disclose("A", "x", { open: true, id: "phase" }), /data-did="phase" open>/);
});

ok("the summary looks like a button: border, white, SHOW/HIDE word, hover and focus, 44 px", () => {
  const css = readFileSync(new URL("../../evals-lab/src/styles/disclose.css", import.meta.url), "utf8");
  const rule = (sel) => css.match(new RegExp(`${sel.replace(/[>.]/g, "\\$&")}[^{]*\\{([^}]*)\\}`))?.[1] ?? "";
  const base = rule("details.disclose > summary,");
  assert.match(base, /border: 1px solid var\(--line\)/);
  assert.match(base, /background: #fff/);
  assert.match(base, /min-height: 44px/);
  assert.match(base, /cursor: pointer/);
  assert.match(css, /summary::before[\s\S]*?content: "\+"/);
  assert.match(css, /\[open\] > summary::before[\s\S]*?content: "-"/);
  assert.match(css, /summary::after[\s\S]*?content: "SHOW"/);
  assert.match(css, /\[open\] > summary::after[\s\S]*?content: "HIDE"/);
  assert.match(css, /summary:hover,[\s\S]*?summary:focus-visible[\s\S]*?background: var\(--ink\)/);
  assert.match(css, /summary:focus-visible[\s\S]*?outline: 3px solid/);
});

console.log(`${n} checks passed`);
