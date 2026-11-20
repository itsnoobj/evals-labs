import test from "node:test";
import assert from "node:assert/strict";
import { stepperHtml, taskSquares } from "../../evals-lab/src/ui/mission-stepper.js";
import { MISSIONS } from "../../evals-lab/src/ui/lessons.js";

test("five squares, each a link to its mission screen, with a 1-2 word label", () => {
  const html = stepperHtml("golden", []);
  assert.equal(html.match(/<li class="mstep /g).length, 5);
  for (const m of MISSIONS) {
    assert.ok(html.includes(`href="#${m.id}"`), m.id);
    assert.ok(html.includes(`<span class="mstep-name" aria-hidden="true">${m.short}</span>`), m.id);
    assert.ok(m.short.split(" ").length <= 2, m.short);
  }
});

test("exactly one current step: aria-current, 'you are here' for screen readers, visible 'now'", () => {
  const html = stepperHtml("metrics", []);
  assert.equal(html.match(/aria-current="step"/g).length, 1);
  assert.equal(html.match(/class="mstep is-now"/g).length, 1);
  assert.equal(html.match(/>now</g).length, 1);
  assert.match(html, /aria-label="Mission 2 of 5: Checks, you are here"/);
  assert.match(html, /aria-label="Mission 3 of 5: Test set, to do"/);
});

test("done steps show a tick and say 'done' in the aria label", () => {
  const html = stepperHtml("golden", ["run", "metrics"]);
  assert.equal(html.match(/class="mstep is-done"/g).length, 2);
  assert.equal(html.match(/\u2713/g).length, 2);
  assert.match(html, /aria-label="Mission 1 of 5: Run, done"/);
  assert.ok(!/Mission 3[^"]*done/.test(html));
});

test("a done current step keeps 'now' and also says done", () => {
  const html = stepperHtml("run", ["run"]);
  assert.match(html, /aria-label="Mission 1 of 5: Run, you are here, done"/);
  assert.match(html, /class="mstep is-now"/);
});

test("an unknown current id marks no step as current", () => {
  assert.ok(!stepperHtml("nope", []).includes("aria-current"));
});

test("taskSquares: filled for done, hollow for the rest, with the numbers written elsewhere", () => {
  assert.equal(taskSquares(2, 3), "\u25A0\u25A0\u25A1");
  assert.equal(taskSquares(0, 2), "\u25A1\u25A1");
  assert.equal(taskSquares(3, 3), "\u25A0\u25A0\u25A0");
  assert.equal(taskSquares(5, 3), "\u25A0\u25A0\u25A0\u25A0\u25A0"); // never negative repeat
});
