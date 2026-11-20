// Run: node tests/ui/explain-dialog.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { explainHtml, runLinesHtml, QMARK, ASK_COPIED, ASK_FALLBACK } from "../../evals-lab/src/ui/explain-dialog.js";
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
  assert.equal(sections.length, 3, "2 given sections + Ask your own AI");
  assert.ok(sections.every((s) => !s.includes(" open")));
  assert.ok(sections[0].includes('data-did="t-data"'));
  assert.ok(explainHtml({ ...base, moreSections: [{ summary: "S", html: "", open: true }] }).includes(" open>"));
});

test("no given sections: only Ask your own AI in the more block; no visual: no visual block", () => {
  const h = explainHtml({ title: "T", what: "a.", why: "b." });
  assert.equal((h.match(/<details/g) ?? []).length, 1);
  assert.ok(!h.includes("xp-visual"));
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

test("Ask your own AI: last section, id ask-own-ai, starts closed, holds the prompt and the copy button", () => {
  const h = explainHtml({ ...base, askTerms: ["checks", "run"] });
  const tag = h.match(/<details class="disclose xp-sec" data-did="ask-own-ai"[^>]*>/)?.[0];
  assert.ok(tag, "section exists");
  assert.ok(!tag.includes(" open"), "starts closed");
  assert.ok(h.indexOf("ask-own-ai") > h.indexOf("Open-source tools"), "it is the last section");
  assert.ok(h.includes("<summary>Ask your own AI</summary>"));
  assert.match(h, /<textarea[^>]*rows="8"[^>]*readonly/);
  assert.ok(h.includes("data-ask-copy") && h.includes(">COPY PROMPT</button>"));
  assert.ok(h.includes("Nothing is sent from this page."));
  const line = "Copy this prompt into a chatbot you use. It can be wrong: check its answer against this pop-up.";
  assert.ok(h.includes(line) && line.split(" ").length <= 25);
  assert.equal(ASK_COPIED, "Copied");
  assert.equal(ASK_FALLBACK, "Press Ctrl/Cmd+C to copy");
});

test("Ask your own AI: the prompt holds the pop-up's own text and run lines, and only the glossary words it uses", () => {
  const h = explainHtml({
    title: "The checks",
    what: "Tests that read a run.",
    why: "They find wrong answers.",
    thisRunHtml: runLinesHtml([{ state: "FAIL", text: "Reward 5 & more <b>x</b>" }]),
    askTerms: ["checks", "retry", "answer key"],
  });
  const text = h.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1];
  for (const part of [
    "ELEMENT: The checks",
    "Tests that read a run.",
    "They find wrong answers.",
    "FAIL Reward 5 &amp; more x",
  ])
    assert.ok(text.includes(part), part);
  assert.ok(text.includes("- checks: Automatic tests"), "used word is listed");
  assert.ok(!text.includes("retry:") && !text.includes("answer key:"), "unused words are left out");
  assert.ok(text.endsWith("MY QUESTION: "));
  assert.ok(!/<[a-z/]/i.test(text.replace(/&lt;|&gt;/g, "")), "no tags");
});

test("the ? mark is aria-hidden text and a 24 px square in the css", () => {
  assert.equal(QMARK, '<span class="qmark" aria-hidden="true">?</span>');
  const css = readFileSync(new URL("../../evals-lab/src/styles/explain.css", import.meta.url), "utf8");
  const rule = css.match(/\.qmark \{[^}]*\}/)[0];
  assert.ok(
    /width: 24px/.test(rule) && /height: 24px/.test(rule) && /font: 700/.test(rule) && /var\(--mono\)/.test(rule),
  );
});
