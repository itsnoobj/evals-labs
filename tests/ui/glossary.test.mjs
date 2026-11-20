// Run: node --test tests/ui/glossary.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { GLOSSARY, SCREEN_TERMS, MORE, glossaryHtml } from "../../evals-lab/src/ui/glossary.js";

const REQUIRED = [
  "eval",
  "agent",
  "agent with evals",
  "agent without evals",
  "tool call",
  "guardrail",
  "safety net",
  "checker",
  "retry",
  "fallback",
  "refuse",
  "checks",
  "test set (golden set)",
  "answer key",
  "LLM judge",
  "wiring",
  "trace",
  "pass bar",
  "run",
];

test("every required term is defined", () => {
  for (const term of REQUIRED) assert.ok(GLOSSARY[term], term);
});

test("every sentence has at most 15 words and is one sentence", () => {
  for (const [term, text] of Object.entries(GLOSSARY)) {
    assert.ok(text.trim().split(/\s+/).length <= 15, `${term}: too long`);
    assert.match(text, /^[A-Z][^.;:!?]*\.$/, `${term}: must be one sentence ending in a full stop`);
  }
});

test("the only digits are the 0 to 5 grade of the LLM judge", () => {
  for (const [term, text] of Object.entries(GLOSSARY))
    if (term !== "LLM judge") assert.ok(!/\d/.test(text), `${term}: ${text}`);
  assert.match(GLOSSARY["LLM judge"], /0 to 5/);
});

test("every screen lists only existing terms, without repeats", () => {
  assert.deepEqual(Object.keys(SCREEN_TERMS), ["start", "run", "checks", "golden", "errors", "compare"]);
  for (const [screen, terms] of Object.entries(SCREEN_TERMS)) {
    assert.equal(new Set(terms).size, terms.length, `${screen}: repeated term`);
    for (const t of terms) assert.ok(GLOSSARY[t], `${screen}: unknown term ${t}`);
  }
  assert.deepEqual(SCREEN_TERMS.start, ["eval", "agent", "tool call", "checks"]);
  assert.deepEqual(SCREEN_TERMS.run, ["tool call", "agent", "checks", "answer key", "run"]);
  assert.deepEqual(SCREEN_TERMS.checks, ["checks", "answer key", "pass bar", "LLM judge", "trace"]);
  assert.deepEqual(SCREEN_TERMS.golden, ["test set (golden set)", "answer key", "pass bar", "run"]);
  assert.deepEqual(SCREEN_TERMS.errors, ["run", "checks", "retry", "test set (golden set)"]);
});

test("Side by side covers every term the page uses for the two agents", () => {
  for (const t of REQUIRED.filter((x) => x !== "pass bar")) assert.ok(SCREEN_TERMS.compare.includes(t), t);
});

test("the two long texts are kept under guardrail and wiring", () => {
  assert.deepEqual(Object.keys(MORE).sort(), ["guardrail", "wiring"]);
  assert.match(MORE.guardrail, /Ignore previous instructions/);
  assert.match(MORE.wiring, /Dashed boxes/);
  const html = glossaryHtml("compare");
  assert.ok(html.includes(MORE.guardrail) && html.includes(MORE.wiring));
});

test("markup is one closed details with a definition list of the screen's terms", () => {
  for (const [screen, terms] of Object.entries(SCREEN_TERMS)) {
    const html = glossaryHtml(screen);
    const moreCount = terms.filter((t) => MORE[t]).length;
    assert.match(
      html,
      new RegExp(`^<details class="disclose" data-did="glossary-${screen}"><summary>Words used here</summary>`),
    );
    assert.ok(!/^<details[^>]* open/.test(html), `${screen}: must start closed`);
    assert.equal((html.match(/<details/g) ?? []).length, 1 + moreCount, screen);
    assert.equal((html.match(/<details[^>]* open/g) ?? []).length, 0, screen);
    assert.equal((html.match(/<dt>/g) ?? []).length, terms.length, screen);
    assert.equal((html.match(/<dd>/g) ?? []).length, terms.length, screen);
  }
});

test("a screen lists only its own terms", () => {
  const html = glossaryHtml("golden");
  assert.ok(html.includes("<dt>Test set (golden set)</dt>"));
  assert.ok(!html.includes("<dt>Guardrail</dt>"));
});

test("an unknown screen throws", () => {
  assert.throws(() => glossaryHtml("nope"), /unknown screen/);
});

test("terms and sentences are escaped", () => {
  const saved = GLOSSARY.run;
  GLOSSARY.run = `<img src=x onerror="a()"> & 'q'`;
  try {
    const html = glossaryHtml("run");
    assert.ok(!html.includes("<img"));
    assert.ok(html.includes("&lt;img src=x onerror=&quot;a()&quot;&gt; &amp; &#39;q&#39;"));
  } finally {
    GLOSSARY.run = saved;
  }
});
