// Run from repo root: node tests/agent/ai-grader.test.mjs
import assert from "node:assert/strict";
import { CASES, perfectRun } from "../../evals-lab/src/task/cases.js";
import { judgePrompt } from "../../evals-lab/src/evals/engine.js";
import { gradeFiveTimes } from "../../evals-lab/src/agent/ai-grader.js";

let checks = 0;
const check = (fn) => {
  fn();
  checks += 1;
};

const c = CASES[0];
const run = perfectRun(c);

// Fake chat: replies come from a list, and every request is kept.
function fake(texts) {
  const calls = [];
  const chat = async (req) => {
    calls.push(req);
    return { text: texts[calls.length - 1] };
  };
  return { chat, calls };
}

{
  const { chat, calls } = fake(["5", "4", "3", "5", "2"]);
  const r = await gradeFiveTimes(chat, c, run);
  check(() => assert.deepEqual(r.all, [5, 4, 3, 5, 2]));
  check(() => assert.equal(r.median, 4)); // sorted 2,3,4,5,5 -> middle is 4
  check(() => assert.equal(calls.length, 5));
  const { system, user } = judgePrompt(c, run);
  for (const call of calls)
    check(() =>
      assert.deepEqual(call.messages, [
        { role: "system", content: system },
        { role: "user", content: user },
      ]),
    );
  check(() =>
    assert.deepEqual(
      calls.map((x) => x.seed),
      [200, 201, 202, 203, 204],
    ),
  );
  check(() => assert.ok(calls.every((x) => x.temperature === 0.7 && x.max_tokens === 8)));
}

{
  const r = await gradeFiveTimes(fake(["5", "no idea", "4", "4", "5"]).chat, c, run);
  check(() => assert.deepEqual(r.all, [5, "?", 4, 4, 5]));
  check(() => assert.equal(r.median, 4)); // valid 4,4,5,5 -> index floor(3/2)=1 -> 4
}

{
  const r = await gradeFiveTimes(fake(["x", "", "no", "none", "?"]).chat, c, run);
  check(() => assert.deepEqual(r.all, ["?", "?", "?", "?", "?"]));
  check(() => assert.equal(r.median, null));
}

// A failing chat rejects, so the caller can show the error.
await assert.rejects(() => gradeFiveTimes(async () => Promise.reject(new Error("boom")), c, run), /boom/);
checks += 1;

console.log(`${checks} checks passed`);
