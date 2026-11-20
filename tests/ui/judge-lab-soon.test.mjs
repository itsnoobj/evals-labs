// Run: node tests/ui/judge-lab-soon.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { judgeLabSoonHtml, STEPS, LEAD, WHY, STATUS, TITLE } from "../../evals-lab/src/ui/judge-lab-soon.js";

const html = judgeLabSoonHtml();
const text = (h) =>
  h
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&rarr;/g, "")
    .replace(/\s+/g, " ")
    .trim();

test("title, status and the 4 planned steps", () => {
  assert.ok(html.includes(`<h1 id="judge-h">${TITLE}</h1>`));
  assert.equal(TITLE, "6 \u00b7 LLM judge lab (coming soon)");
  assert.ok(html.includes(STATUS) && STATUS === "NOT BUILT YET");
  assert.equal((html.match(/class="js-step"/g) ?? []).length, 4);
  assert.deepEqual(
    STEPS.map((s) => s[1]),
    [
      "You grade 10 replies",
      "The LLM judge grades the same 10",
      "Compare: how often do they agree?",
      "Swap the order: does the judge change its mind?",
    ],
  );
  for (const [, label] of STEPS) assert.ok(html.includes(label));
  assert.equal((html.match(/<svg /g) ?? []).length, 4, "one pictogram per step");
});

test("lead is one sentence of at most 18 words", () => {
  assert.ok(html.includes(`<p class="lead">${LEAD}</p>`));
  assert.ok(LEAD.trim().split(/\s+/).length <= 18);
  assert.equal(LEAD.split(/[.!?](?:\s|$)/).filter(Boolean).length, 1);
});

test("no digits except the 10 replies in the flow labels (title and the Why line are checked separately)", () => {
  const body = html
    .replace(/<h1[\s\S]*?<\/h1>/, "")
    .replace(/<p class="js-why">[\s\S]*?<\/p>/, "")
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/&#?\w+;/g, "");
  assert.deepEqual(
    [...body.matchAll(/\d+/g)].map((m) => m[0]),
    ["10", "10"],
  );
});

test("the Why line repeats the sentence on the Checks screen (check-details.js)", () => {
  const src = readFileSync(new URL("../../evals-lab/src/ui/check-details.js", import.meta.url), "utf8");
  assert.ok(src.includes(`Known weakness: ${WHY}`), "same words as check-details.js");
  assert.ok(html.includes(`Why it is coming:</b> ${WHY}`));
});

test("a closed section with 3 bullets, a link to Checks, and a note that the judge already runs", () => {
  const d = html.match(/<details[\s\S]*?<\/details>/)[0];
  assert.ok(!/\bopen\b/.test(d.match(/<details[^>]*>/)[0]), "closed");
  assert.ok(d.includes("<summary>What will you be able to do?</summary>"));
  assert.equal((d.match(/<li>/g) ?? []).length, 3);
  assert.ok(html.includes('<a class="btn" href="#metrics">Try the LLM judge now'));
  assert.ok(text(html).includes("The judge already runs on Checks and Side by side."));
});

test("no fake interactive UI: the only controls are the closed section and one link", () => {
  assert.ok(!/<(button|input|select|textarea)\b/.test(html));
  assert.equal((html.match(/<a /g) ?? []).length, 1);
});

test("css: judge-soon.css is square and flat", () => {
  const css = readFileSync(new URL("../../evals-lab/src/styles/judge-soon.css", import.meta.url), "utf8");
  assert.ok(!/border-radius\s*:\s*[1-9]/.test(css) && !/box-shadow/.test(css));
  const page = readFileSync(new URL("../../evals-lab/index.html", import.meta.url), "utf8");
  assert.ok(page.includes('href="src/styles/judge-soon.css"'));
  assert.ok(page.includes('<div id="judge-soon"'));
});
