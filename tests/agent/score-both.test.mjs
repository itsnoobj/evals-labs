import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CASES, perfectRun } from "../../evals-lab/src/task/cases.js";
import { scoreRun } from "../../evals-lab/src/evals/engine.js";
import { runGuarded, makeReplayChat } from "../../evals-lab/src/agent/guarded-agent.js";
import { scoreBoth, replayRunAgent } from "../../evals-lab/src/agent/score-both.js";

const withFinal = (run, patch) => ({
  ...run,
  steps: run.steps.map((s) => (s.kind === "final" ? { ...s, ...patch } : s)),
});
const wrongRun = (c) => withFinal(perfectRun(c), { card: "not_a_card", reward_inr: 0 });

// Fake agent: simple passes only on even runIndex, careful always passes.
const fakeAgent = (calls = []) => {
  return async (kind, c, runIndex) => {
    calls.push([kind, c.id, runIndex]);
    return kind === "careful" || runIndex % 2 === 0 ? perfectRun(c) : wrongRun(c);
  };
};

test("counts, rates and perCase for the fake agent", async () => {
  const cases = CASES.slice(0, 3);
  const out = await scoreBoth({ cases, runsPerCase: 4, runAgent: fakeAgent() });
  assert.equal(out.aborted, false);
  assert.equal(out.careful.passed, 12);
  assert.equal(out.careful.total, 12);
  assert.equal(out.careful.rate, 1);
  assert.equal(out.simple.passed, 6); // runIndex 0 and 2 of 0..3, for 3 cases
  assert.equal(out.simple.total, 12);
  assert.equal(out.simple.rate, 0.5);
  for (const c of cases) {
    assert.deepEqual(out.simple.perCase[c.id], { passed: 2, total: 4 });
    assert.deepEqual(out.careful.perCase[c.id], { passed: 4, total: 4 });
  }
  assert.deepEqual(
    Object.keys(out.simple.perCase),
    cases.map((c) => c.id),
  );
});

test("rate is not rounded", async () => {
  const out = await scoreBoth({ cases: CASES.slice(0, 1), runsPerCase: 3, runAgent: fakeAgent() });
  assert.equal(out.simple.rate, 2 / 3); // runIndex 0 and 2 pass
});

test("runs are sequential, case by case, simple then careful, and onProgress follows that order", async () => {
  const cases = CASES.slice(0, 2);
  const events = [];
  let running = 0;
  let maxRunning = 0;
  const base = fakeAgent(events);
  const runAgent = async (...args) => {
    running += 1;
    maxRunning = Math.max(maxRunning, running);
    await new Promise((r) => setTimeout(r, 1));
    running -= 1;
    return base(...args);
  };
  const progress = [];
  await scoreBoth({ cases, runsPerCase: 2, runAgent, onProgress: (p) => progress.push(p) });
  assert.equal(maxRunning, 1);
  assert.equal(progress.length, 8);
  assert.deepEqual(
    progress.map((p) => [p.kind, p.caseId]),
    events.map(([kind, caseId]) => [kind, caseId]),
  );
  assert.deepEqual(
    progress.map((p) => p.done),
    [1, 2, 3, 4, 5, 6, 7, 8],
  );
  assert.ok(progress.every((p) => p.total === 8));
  assert.deepEqual(
    events.map(([kind, id, i]) => `${kind}:${id}:${i}`),
    [
      `simple:${cases[0].id}:0`,
      `careful:${cases[0].id}:0`,
      `simple:${cases[0].id}:1`,
      `careful:${cases[0].id}:1`,
      `simple:${cases[1].id}:0`,
      `careful:${cases[1].id}:0`,
      `simple:${cases[1].id}:1`,
      `careful:${cases[1].id}:1`,
    ],
  );
});

test("abort stops early and returns partial results", async () => {
  const ctl = new AbortController();
  const calls = [];
  const out = await scoreBoth({
    cases: CASES,
    runsPerCase: 2,
    runAgent: fakeAgent(calls),
    onProgress: ({ done }) => {
      if (done === 3) ctl.abort();
    },
    signal: ctl.signal,
  });
  assert.equal(out.aborted, true);
  assert.equal(calls.length, 3);
  assert.equal(out.simple.total, 2);
  assert.equal(out.careful.total, 1);
  assert.equal(out.simple.perCase[CASES[0].id].total, 2);
  assert.deepEqual(out.simple.perCase[CASES[1].id], { passed: 0, total: 0 }); // not reached
});

test("an already aborted signal runs nothing", async () => {
  const calls = [];
  const out = await scoreBoth({
    cases: CASES,
    runsPerCase: 1,
    runAgent: fakeAgent(calls),
    signal: AbortSignal.abort(),
  });
  assert.equal(calls.length, 0);
  assert.equal(out.aborted, true);
  assert.equal(out.simple.total, 0);
  assert.equal(out.simple.rate, 0);
});

test("empty cases and runsPerCase 0 give total 0, rate 0, no calls", async () => {
  for (const args of [
    { cases: [], runsPerCase: 5 },
    { cases: CASES, runsPerCase: 0 },
  ]) {
    const calls = [];
    const progress = [];
    const out = await scoreBoth({ ...args, runAgent: fakeAgent(calls), onProgress: (p) => progress.push(p) });
    assert.equal(calls.length, 0);
    assert.equal(progress.length, 0);
    assert.equal(out.aborted, false);
    for (const kind of ["simple", "careful"]) {
      assert.equal(out[kind].total, 0);
      assert.equal(out[kind].passed, 0);
      assert.equal(out[kind].rate, 0);
    }
  }
  const empty = await scoreBoth({ cases: [], runsPerCase: 5, runAgent: fakeAgent() });
  assert.deepEqual(empty.simple.perCase, {});
});

test("pass rule: no final, wrong card, wrong reward, refused and blocked runs do not pass; a fallback with the right card passes", async () => {
  const c = CASES[0];
  const good = perfectRun(c);
  const variants = {
    good: [good, 1],
    noFinal: [{ ...good, steps: good.steps.filter((s) => s.kind !== "final") }, 0],
    wrongCard: [withFinal(good, { card: "not_a_card" }), 0],
    wrongReward: [withFinal(good, { reward_inr: good.steps.at(-1).reward_inr + 100 }), 0],
    refused: [withFinal(good, { card: null, reward_inr: null, source: "refused" }), 0],
    blocked: [{ caseId: c.id, steps: [], source: "blocked" }, 0],
    fallback: [withFinal(good, { source: "fallback" }), 1],
  };
  for (const [name, [run, want]] of Object.entries(variants)) {
    const out = await scoreBoth({ cases: [c], runsPerCase: 1, runAgent: async () => run });
    assert.equal(out.simple.passed, want, name);
  }
});

test("runAgent that returns something without steps is rejected (e.g. a whole runGuarded result)", async () => {
  await assert.rejects(
    scoreBoth({
      cases: [CASES[0]],
      runsPerCase: 1,
      runAgent: async () => ({ run: perfectRun(CASES[0]), outcome: "x" }),
    }),
    TypeError,
  );
  await assert.rejects(scoreBoth({ cases: CASES, runsPerCase: -1, runAgent: fakeAgent() }), RangeError);
});

// Replay over the real recorded runs. Expected totals are derived from the data, not typed in.
const recorded = JSON.parse(readFileSync(new URL("../../evals-lab/data/recorded-runs.json", import.meta.url), "utf8"));

test("replay over recorded-runs.json matches the totals implied by the data", async () => {
  const poolSize = Math.min(...CASES.map((c) => recorded.free.filter((r) => r.caseId === c.id).length));
  assert.ok(poolSize > 0);
  for (const c of CASES) {
    for (const mode of ["free", "constrained"])
      assert.equal(recorded[mode].filter((r) => r.caseId === c.id).length, poolSize, `${mode} ${c.id}`);
  }
  const progress = [];
  const out = await scoreBoth({
    cases: CASES,
    runsPerCase: poolSize, // each recorded run is the first pick once per case
    runAgent: replayRunAgent(recorded),
    onProgress: (p) => progress.push(p),
  });
  assert.equal(progress.length, CASES.length * poolSize * 2);

  // simple: every recorded free run, scored directly.
  const freePass = (c) => recorded.free.filter((r) => r.caseId === c.id && scoreRun(c, r).task_success.pass).length;
  // careful: each constrained run as first attempt (same method as scripts/summarize-recorded-runs.mjs).
  const carefulPass = async (c) => {
    const pool = recorded.constrained.filter((r) => r.caseId === c.id);
    let n = 0;
    for (let i = 0; i < pool.length; i++) {
      const res = await runGuarded(makeReplayChat([...pool.slice(i), ...pool.slice(0, i)]), c, { model: "replay" });
      if (scoreRun(c, res.run).task_success.pass) n += 1;
    }
    return n;
  };
  let simpleTotal = 0;
  let carefulTotal = 0;
  for (const c of CASES) {
    const s = freePass(c);
    const k = await carefulPass(c);
    simpleTotal += s;
    carefulTotal += k;
    assert.deepEqual(out.simple.perCase[c.id], { passed: s, total: poolSize }, `simple ${c.id}`);
    assert.deepEqual(out.careful.perCase[c.id], { passed: k, total: poolSize }, `careful ${c.id}`);
  }
  assert.equal(out.simple.total, CASES.length * poolSize);
  assert.equal(out.simple.passed, simpleTotal);
  assert.equal(out.simple.rate, simpleTotal / (CASES.length * poolSize));
  assert.equal(out.careful.passed, carefulTotal);
  assert.equal(out.careful.rate, carefulTotal / (CASES.length * poolSize));
});

test("replayRunAgent: seedBase shifts which recorded run is used, and the recorded data is not mutated", async () => {
  const c = CASES[0];
  const before = JSON.stringify(recorded);
  const pool = recorded.free.filter((r) => r.caseId === c.id);
  const run = await replayRunAgent(recorded, { seedBase: 3 })("simple", c, 4); // seed 7, 7 % pool.length
  assert.deepEqual(run, pool[7 % pool.length]);
  run.steps.length = 0;
  assert.equal(JSON.stringify(recorded), before);
});
