// Run: node tests/ui/lessons.test.mjs
import assert from "node:assert/strict";
import { CASES, perfectRun } from "../../evals-lab/src/task/cases.js";
import { METRICS, BUGS, scoreRun, injectBug } from "../../evals-lab/src/evals/engine.js";
import { STAGES, METRIC_STAGE, BUG_STAGE, BUG_LESSON, MISSIONS, stageStates } from "../../evals-lab/src/ui/lessons.js";

let n = 0;
const ok = (name, fn) => {
  fn();
  n += 1;
  console.log(`ok  ${name}`);
};
const c = CASES[0];
const perfect = perfectRun(c);

ok("every metric and bug has teaching copy", () => {
  for (const m of METRICS) assert.ok(METRIC_STAGE[m.id]?.length, m.id);
  for (const b of BUGS) {
    assert.ok(BUG_STAGE[b.id], b.id);
    assert.ok(BUG_LESSON[b.id], b.id);
  }
  for (const stages of Object.values(METRIC_STAGE))
    for (const s of stages)
      assert.ok(
        STAGES.some((x) => x.id === s),
        s,
      );
});

ok("mission task ids are unique and every mission has a required task", () => {
  const ids = MISSIONS.flatMap((m) => m.tasks.map((t) => t.id));
  assert.equal(new Set(ids).size, ids.length);
  for (const m of MISSIONS)
    assert.ok(
      m.tasks.some((t) => !t.bonus),
      m.id,
    );
});

ok("perfect run: every stage ok, no extras", () => {
  const s = stageStates(c, perfect, { scores: scoreRun(c, perfect) });
  assert.deepEqual([s.classify, s.rank, s.answer, s.checks], ["ok", "ok", "ok", "done"]);
  assert.deepEqual(s.extras, []);
});

ok("skip_tool: classify missing, rank still ok", () => {
  const run = injectBug(c, perfect, "skip_tool");
  const s = stageStates(c, run, { scores: scoreRun(c, run) });
  assert.deepEqual([s.classify, s.rank], ["missing", "ok"]);
});

ok("wrong_number: tools ok, answer bad", () => {
  const run = injectBug(c, perfect, "wrong_number_in_reply");
  const s = stageStates(c, run, { scores: scoreRun(c, run) });
  assert.deepEqual([s.classify, s.rank, s.answer], ["ok", "ok", "bad"]);
});

ok("duplicate and invented tools show up as extras", () => {
  assert.deepEqual(stageStates(c, injectBug(c, perfect, "duplicate_call")).extras, ["rank_cards (repeat)"]);
  assert.deepEqual(stageStates(c, injectBug(c, perfect, "invented_tool")).extras, ["check_credit_limit"]);
});

ok("wrong tool arguments mark the stage bad", () => {
  const run = structuredClone(perfect);
  run.steps[1].args = { amount: 1, category: "utilities" };
  assert.equal(stageStates(c, run).rank, "bad");
});

ok("running: next missing stage is active, later ones idle", () => {
  const partial = { ...perfect, steps: perfect.steps.slice(0, 1) };
  const s = stageStates(c, partial, { running: true });
  assert.deepEqual([s.classify, s.rank, s.answer, s.checks], ["ok", "active", "idle", "idle"]);
  const empty = stageStates(c, { ...perfect, steps: [] }, { running: true });
  assert.deepEqual([empty.classify, empty.rank, empty.answer], ["active", "idle", "idle"]);
});

ok("typed question (no answer key): called tools are done, uncalled are skipped, never ok or bad", () => {
  const custom = { id: "CUSTOM", query: "x", custom: true, expected: null, expectedTrajectory: null };
  const noRank = { ...perfect, steps: perfect.steps.filter((s) => s.kind !== "tool" || s.tool !== "rank_cards") };
  const s = stageStates(custom, noRank, { scores: scoreRun(custom, noRank) });
  assert.deepEqual([s.classify, s.rank, s.answer, s.checks], ["done", "skipped", "done", "done"]);
  assert.deepEqual(s.extras, []);
  const running = stageStates(custom, { ...perfect, steps: [] }, { running: true });
  assert.deepEqual([running.classify, running.rank, running.answer], ["active", "idle", "idle"]);
});

console.log(`${n} checks passed`);
