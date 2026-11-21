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
  DEMO_NOTE,
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

// What the agent without evals did: no final step at all, a right card, or a wrong card.
const simpleWord = (c, run) =>
  word(c, run) === "right"
    ? "right"
    : run.steps.some((st) => st.kind === "final")
      ? "picks the wrong card"
      : "no answer, a tool call fails";

// The sentence the button should carry, built only from what the replay produced.
async function outcomeWords(item) {
  const { c, careful } = await replay(item);
  const simple = simpleWord(c, pool("free", item.caseId, item.seed)[0]);
  assert.equal(word(c, careful.run), "right");
  assert.equal(word(c, careful.attempts[0].run), "wrong"); // the first try was wrong: that is what the checker caught
  if (item.id === "safety-net") {
    assert.equal(careful.outcome, "fixed_by_fallback");
    return `Without evals: ${simple}. With evals: retries fail, the fallback gives the right card.`;
  }
  assert.equal(careful.outcome, "passed_after_retry");
  assert.ok(careful.attempts.length > 1);
  return item.id === "wrong-card"
    ? `Without evals: ${simple}. With evals: the checker catches it, right after a retry.`
    : `Without evals: ${simple}. With evals: right after a retry.`;
}

test("the three buttons exist: WRONG CARD, NO ANSWER, SAFETY NET", () => {
  assert.deepEqual(
    TRY_THESE.map((t) => [t.id, t.label]),
    [
      ["wrong-card", "WRONG CARD"],
      ["no-answer", "NO ANSWER"],
      ["safety-net", "SAFETY NET"],
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

test("every demo: without evals fails, with evals ends right", async () => {
  for (const item of TRY_THESE) {
    const { simple, careful, c } = await replay(item);
    assert.equal(simple, "wrong", item.id);
    assert.equal(word(c, careful.run), "right", item.id);
  }
});

test("question label is merchant and amount from CASES", () => {
  assert.equal(questionLabel("C05"), "BESCOM, ₹1,800");
  assert.equal(questionLabel("C01"), "Amazon, ₹15,000");
});

test("visible text has no run number or case id; chips are short", () => {
  for (const reason of ["", NOT_LOADED, LOADING]) {
    const html = tryTheseHtml({ disabledReason: reason });
    const text = html.replace(/<[^>]+>/g, " ");
    assert.ok(!/run number|seed|\bC0\d\b/i.test(text), reason);
    assert.equal(
      (html.match(/<span class="try-title">(WRONG CARD|NO ANSWER|SAFETY NET)<\/span>/g) ?? []).length,
      3,
      reason,
    );
  }
});

test("each chip keeps its tested outcome text as a one-line caption", () => {
  const html = tryTheseHtml();
  for (const t of TRY_THESE) assert.ok(html.includes(`<span class="try-out">${t.outcome}</span>`), t.id);
});

test("enabled: three enabled buttons and no long hint; the live AI chosen only adds the recorded-demo note", () => {
  const on = tryTheseHtml();
  assert.equal((on.match(/<button/g) ?? []).length, 3);
  assert.ok(!/disabled/.test(on));
  assert.ok(!/try-note/.test(on));
  const live = tryTheseHtml({ recordedDemo: true });
  assert.ok(!/disabled/.test(live), "no 'Recorded runs only' disabled state in live mode");
  assert.ok(!/Recorded runs only/.test(live));
  assert.ok(live.includes(DEMO_NOTE));
  assert.equal((live.match(/<button/g) ?? []).length, 3);
});

test("not loaded or loading: all disabled with the reason as text", () => {
  const off = tryTheseHtml({ disabledReason: LOADING, recordedDemo: true });
  assert.equal((off.match(/<button[^>]* disabled>/g) ?? []).length, 3);
  assert.equal((off.match(/<span class="try-why">Wait until the model finishes loading<\/span>/g) ?? []).length, 3);
  assert.ok(!off.includes(DEMO_NOTE));
});
