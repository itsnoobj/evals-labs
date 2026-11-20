import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CARDS, CASES, DEFAULT_CASE_ID, perfectRun } from "../../evals-lab/src/task/cases.js";
import { STAGES } from "../../evals-lab/src/ui/lessons.js";
import { VISUAL_IDS } from "../../evals-lab/src/ui/node-visuals.js";
import { START_CUE, startVisualHtml } from "../../evals-lab/src/ui/start-visual.js";

const html = startVisualHtml({ metricCount: 8 });
const words = (s) =>
  s
    .replace(/<span class="qmark"[^>]*>\?<\/span>/g, "") // the "?" mark is a symbol, not a word
    .replace(/<[^>]+>/g, " ")
    .replace(/&[a-z#0-9]+;/g, "x")
    .split(/\s+/)
    .filter(Boolean).length;

test("5 diagram boxes, one per stage, in order, with an arrow between each", () => {
  const ids = [...html.matchAll(/data-stage="([a-z]+)"/g)].map((m) => m[1]);
  assert.deepEqual(
    ids,
    STAGES.map((s) => s.id),
  );
  assert.equal((html.match(/class="sv-arrow"/g) ?? []).length, 4);
  assert.equal((html.match(/→/g) ?? []).length, 4 + 1, "4 arrows between boxes + 1 inside the classify example");
  for (const s of STAGES) assert.ok(VISUAL_IDS.includes(`stage-${s.id}`));
  assert.equal((html.match(/<svg /g) ?? []).length, 5, "one pictogram per box");
});

test("labels are 4 words or fewer and examples come from the default case", () => {
  const labels = [...html.matchAll(/<b class="sv-label">([^<]+)<\/b>/g)].map((m) => m[1]);
  assert.deepEqual(labels, ["Question", "Find the shop type", "Rank the 4 cards", "Answer", "Checks"]);
  for (const l of labels) assert.ok(words(l) <= 4, l);
  const c = CASES.find((x) => x.id === DEFAULT_CASE_ID);
  const final = perfectRun(c).steps.at(-1);
  assert.ok(html.includes(c.query));
  assert.ok(html.includes(`${CARDS[final.card].name}, ₹${final.reward_inr}`));
  assert.ok(html.includes("8 checks, each PASS or FAIL"));
});

test("4 card images, 96 px wide, each with its name as text", () => {
  assert.equal((html.match(/<img class="card-art"[^>]*width="96"/g) ?? []).length, 4);
  for (const { name } of Object.values(CARDS)) assert.ok(html.includes(`<span class="sv-cname">${name}</span>`), name);
});

test("what-you-will-do strip is 12 words or fewer; the cue text is the agreed one", () => {
  const strip = html.match(/<ol class="sv-do"[\s\S]*?<\/ol>/)[0];
  assert.ok(words(strip) <= 12, strip);
  assert.ok(strip.includes("Run it.") && strip.includes("Break it.") && strip.includes("See which check notices."));
  assert.equal(START_CUE, "Click a box to see what it is.");
  assert.ok(html.includes(START_CUE));
});

test("visible words: the picture has at most 90, the whole Start screen at most 125", () => {
  // Pictogram captions are not printed here (nodeIconHtml), so every word in `html` is visible.
  assert.ok(words(html) <= 90, `picture has ${words(html)} words`);
  const page = readFileSync(new URL("../../evals-lab/index.html", import.meta.url), "utf8");
  const start = page.match(/<section id="start"[\s\S]*?<\/section>/)[0];
  // Closed <details> keep only their <summary>; the picture is rendered into #start-visual by start-screen.js.
  const visible = start
    .replace(/<details[^>]*>\s*(<summary>[\s\S]*?<\/summary>)[\s\S]*?<\/details>/g, "$1")
    .replace(/<div id="start-visual"[^>]*><\/div>/, html);
  assert.ok(!/<details[^>]*\bopen\b/.test(start), "Start details are closed");
  assert.ok(words(visible) <= 125, `Start screen has ${words(visible)} words`);
});

test("Start has no 'The task' or 'The four cards' bar; Details, Rates per card and Five missions stay closed", () => {
  const page = readFileSync(new URL("../../evals-lab/index.html", import.meta.url), "utf8");
  const start = page.match(/<section id="start"[\s\S]*?<\/section>/)[0];
  const summaries = [...start.matchAll(/<summary>([^<]+)<\/summary>/g)].map((m) => m[1]);
  assert.deepEqual(summaries, ["Details", "Rates per card", "Five missions"]);
  assert.ok(page.includes('<p class="muted build">build ux19</p>'));
});

test("css: start.css is square and flat", () => {
  const css = readFileSync(new URL("../../evals-lab/src/styles/start.css", import.meta.url), "utf8");
  assert.ok(!/box-shadow|text-shadow/.test(css));
  assert.ok([...css.matchAll(/border-radius\s*:\s*([^;}]+)/g)].every((m) => /^0(px)?$/.test(m[1].trim())));
});
