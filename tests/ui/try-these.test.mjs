// Run: node --test tests/ui/try-these.test.mjs
// The one-line result under each Try these button must be true for data/recorded-runs.json.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CASES } from "../../evals-lab/src/task/cases.js";
import { scoreRun } from "../../evals-lab/src/evals/engine.js";
import { runGuarded, makeReplayChat } from "../../evals-lab/src/agent/guarded-agent.js";
import {
  TRY_THESE,
  LIVE_ONLY,
  NOT_LOADED,
  LOADING,
  questionLabel,
  tryTheseHtml,
} from "../../evals-lab/src/ui/try-these.js";

const recorded = JSON.parse(readFileSync(new URL("../../evals-lab/data/recorded-runs.json", import.meta.url), "utf8"));

// Same rotation as recordedPool() in compare-screen.js: the seed picks the first run of the pool.
const pool = (kind, caseId, seed) => {
  const runs = recorded[kind].filter((r) => r.caseId === caseId);
  const at = Math.abs(seed) % runs.length;
  return [...runs.slice(at), ...runs.slice(0, at)];
};
const word = (c, run) => (scoreRun(c, run).task_success.pass ? "right" : "wrong");

async function replay({ caseId, seed }) {
  const c = CASES.find((x) => x.id === caseId);
  const simple = word(c, pool("free", caseId, seed)[0]);
  const careful = await runGuarded(makeReplayChat(pool("constrained", caseId, seed)), c, {
    model: "recorded",
    seed,
  });
  return { c, simple, careful };
}

// The sentence the button should carry, built only from what the replay produced.
async function outcomeWords(item) {
  const { c, simple, careful } = await replay(item);
  const final = word(c, careful.run);
  const first = word(c, careful.attempts[0].run);
  if (item.id === "gap") {
    assert.equal(careful.outcome, "passed_first_try");
    return `Agent without evals: ${simple}. Agent with evals: ${final} on the first try.`;
  }
  assert.equal(careful.outcome, "passed_after_retry");
  assert.ok(careful.attempts.length > 1);
  return `Agent with evals: ${first} first, ${final} after a retry.`;
}

test("the two buttons exist: SEE THE GAP and SEE A RETRY", () => {
  assert.deepEqual(
    TRY_THESE.map((t) => [t.id, t.label]),
    [
      ["gap", "SEE THE GAP"],
      ["retry", "SEE A RETRY"],
    ],
  );
  for (const t of TRY_THESE)
    assert.ok(
      CASES.some((c) => c.id === t.caseId),
      t.id,
    );
});

for (const item of TRY_THESE) {
  test(`${item.id}: the one-line result is true for the recorded runs`, async () => {
    assert.equal(item.outcome, await outcomeWords(item));
  });
}

test("gap: without evals wrong, with evals right (explicit)", async () => {
  const { simple, careful, c } = await replay(TRY_THESE[0]);
  assert.equal(simple, "wrong");
  assert.equal(word(c, careful.run), "right");
});

test("retry: first try wrong, final right, after a retry (explicit)", async () => {
  const { careful, c } = await replay(TRY_THESE[1]);
  assert.equal(word(c, careful.attempts[0].run), "wrong");
  assert.equal(word(c, careful.run), "right");
});

test("question label is merchant and amount from CASES", () => {
  assert.equal(questionLabel("C05"), "BESCOM, ₹1,800");
  assert.equal(questionLabel("C01"), "Amazon, ₹15,000");
});

test("visible text has no run number or case id", () => {
  for (const reason of ["", LIVE_ONLY, NOT_LOADED, LOADING]) {
    const text = tryTheseHtml({ disabledReason: reason }).replace(/<[^>]+>/g, " ");
    assert.ok(!/run number|seed|\bC0\d\b/i.test(text), reason);
    assert.match(text, /SEE THE GAP: BESCOM, ₹1,800/);
    assert.match(text, /SEE A RETRY: Amazon, ₹15,000/);
  }
});

test("enabled: two enabled buttons; live: both disabled with the reason as text", () => {
  const on = tryTheseHtml();
  assert.equal((on.match(/<button/g) ?? []).length, 2);
  assert.ok(!/disabled/.test(on));
  const off = tryTheseHtml({ disabledReason: LIVE_ONLY });
  assert.equal((off.match(/<button[^>]* disabled>/g) ?? []).length, 2);
  assert.equal((off.match(/<span class="try-why">Recorded runs only<\/span>/g) ?? []).length, 2);
  assert.match(off, /Recorded runs only\. The live model is active\./);
});
