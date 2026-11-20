// Run: node tests/ui/explain-dialog.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { explainHtml, runLinesHtml } from "../../evals-lab/src/ui/explain-dialog.js";
import { NODE_EXPLAIN } from "../../evals-lab/src/ui/node-explainers.js";

const base = {
  title: "The prompt",
  what: "What it is.",
  why: "Why it matters.",
  visualHtml: '<figure class="xvis">V</figure>',
  thisRunHtml: runLinesHtml([{ state: "PASSED", text: "Category: amazon." }]),
  moreSections: [
    { summary: "Real data", html: "<p>raw</p>", id: "t-data" },
    { summary: "Open-source tools", html: "<ul></ul>" },
  ],
};

test("blocks come in the order: title, what, why, in this run, more", () => {
  const h = explainHtml(base);
  const at = (s) => h.indexOf(s);
  const order = ["xp-title", "WHAT IT IS", "WHY IT MATTERS", "IN THIS RUN", "xp-more"].map(at);
  assert.ok(
    order.every((n) => n >= 0),
    String(order),
  );
  assert.deepEqual(
    order,
    [...order].sort((a, b) => a - b),
  );
  assert.ok(at("xvis") > at("WHAT IT IS") && at("xvis") < at("WHY IT MATTERS"), "visual sits in the what block");
});

test("title, what, why and run values are escaped", () => {
  const h = explainHtml({
    ...base,
    title: "<img src=x>",
    what: "<script>1</script>",
    why: 'a "q" & b',
    thisRunHtml: runLinesHtml([{ state: "<b>X</b>", text: "<i>bad</i>" }]),
  });
  for (const raw of ["<img src=x>", "<script>", "<i>bad</i>", "<b>X</b>"]) assert.ok(!h.includes(raw), raw);
  for (const esc of [
    "&lt;img src=x&gt;",
    "&lt;script&gt;1",
    "a &quot;q&quot; &amp; b",
    "&lt;i&gt;bad&lt;/i&gt;",
    "&lt;b&gt;X&lt;/b&gt;",
  ])
    assert.ok(h.includes(esc), esc);
});

test("run lines: the state is a word before the text", () => {
  assert.match(
    runLinesHtml([{ state: "FAILED", text: "x" }]),
    /<li><b class="xp-state">FAILED<\/b> <span>x<\/span><\/li>/,
  );
});

test("more sections are closed click-to-open sections, open only when asked", () => {
  const h = explainHtml(base);
  const sections = [...h.matchAll(/<details class="disclose xp-sec"[^>]*>/g)].map((m) => m[0]);
  assert.equal(sections.length, 2);
  assert.ok(sections.every((s) => !s.includes(" open")));
  assert.ok(sections[0].includes('data-did="t-data"'));
  assert.ok(explainHtml({ ...base, moreSections: [{ summary: "S", html: "", open: true }] }).includes(" open>"));
});

test("no sections: no empty more block; no visual: no visual block", () => {
  const h = explainHtml({ title: "T", what: "a.", why: "b." });
  assert.ok(!h.includes("xp-more") && !h.includes("xp-visual"));
  assert.ok(h.includes("IN THIS RUN"));
});

test("real explainers fit the sentence limit when put through explainHtml", () => {
  for (const [id, { what, why }] of Object.entries(NODE_EXPLAIN)) {
    const h = explainHtml({ title: id, what, why });
    for (const t of [what, why]) assert.ok(t.split(/\s+/).length <= 15, id);
    assert.ok(h.includes(what.replace(/'/g, "&#39;")), id);
  }
});

test("css: square, no shadow, bottom sheet at 600 px", () => {
  const css = readFileSync(new URL("../../evals-lab/src/styles/explain.css", import.meta.url), "utf8");
  assert.ok(!/box-shadow|text-shadow/.test(css));
  assert.ok([...css.matchAll(/border-radius\s*:\s*([^;}]+)/g)].every((m) => /^0(px)?$/.test(m[1].trim())));
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*max-height: 85vh/);
  assert.match(css, /::backdrop/);
});
