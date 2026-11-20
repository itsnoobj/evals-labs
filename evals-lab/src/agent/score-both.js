// Scores the agent without evals ('simple') and the agent with evals ('careful') over a whole test set,
// several runs per case, so the Side by side screen can show a pass rate per agent instead of one lucky or unlucky run.
// Pure ES module, no DOM, no model import: the caller injects runAgent (live model or recorded runs).
import { scoreRun } from "../evals/engine.js";
import { runGuarded, makeReplayChat } from "./guarded-agent.js";

const KINDS = ["simple", "careful"];

// What counts as a pass: exactly what the Side by side screen shows as "right", scoreRun(...).task_success.pass === true.
// The run's last final step must name an accepted card and a reward within 0.5 of the key. So:
//  - careful 'fixed_by_fallback': the fallback final is built from rank_cards, so it passes if that card is right.
//  - careful 'refused' or 'blocked': no card (or no final step at all), so it does not pass.
//  - a run with no final step (simple ran out of steps) does not pass.
//  - a case without an answer key gives pass null, which does not pass. Use cases from CASES only.
const passed = (c, run) => scoreRun(c, run).task_success.pass === true;

const tally = (cases) => ({
  passed: 0,
  total: 0,
  rate: 0,
  perCase: Object.fromEntries(cases.map((c) => [c.id, { passed: 0, total: 0, runs: [] }])),
});

// runAgent(kind, caseObj, runIndex) -> finished run { caseId, steps, ... } for ONE case. kind is 'simple' | 'careful'.
// For the careful agent, return runGuarded(...).run, not the whole runGuarded result.
// Runs are sequential on purpose: one model, and WebGPU cannot run two generations at once.
// Order: case by case, runIndex by runIndex, simple then careful. An abort therefore leaves both agents with the same case coverage (within one run).
// onProgress({ done, total, kind, caseId }): total counts both agents, so done reaches cases.length * runsPerCase * 2.
// Returns { simple, careful, aborted }: { passed, total, rate, perCase: { C01: { passed, total, runs: [bool, ...] } } }.
// rate = passed / total, 0 when total is 0. Nothing is rounded here. If runAgent throws, the error propagates.
export async function scoreBoth({ cases, runsPerCase, runAgent, onProgress, signal }) {
  if (!Number.isInteger(runsPerCase) || runsPerCase < 0) throw new RangeError("runsPerCase must be an integer >= 0");
  const result = { simple: tally(cases), careful: tally(cases), aborted: false };
  const total = cases.length * runsPerCase * KINDS.length;
  let done = 0;

  for (const c of cases) {
    for (let runIndex = 0; runIndex < runsPerCase; runIndex++) {
      for (const kind of KINDS) {
        if (signal?.aborted) {
          result.aborted = true;
          return result;
        }
        const run = await runAgent(kind, c, runIndex);
        if (!Array.isArray(run?.steps)) {
          throw new TypeError(`runAgent('${kind}', ${c.id}, ${runIndex}) must return a run with a steps array`);
        }
        const side = result[kind];
        const ok = passed(c, run);
        side.total += 1;
        side.perCase[c.id].total += 1;
        side.perCase[c.id].runs.push(ok); // one boolean per run, in run order, for the pass/fail grid
        if (ok) {
          side.passed += 1;
          side.perCase[c.id].passed += 1;
        }
        side.rate = side.passed / side.total;
        done += 1;
        onProgress?.({ done, total, kind, caseId: c.id });
      }
    }
  }
  return result;
}

// runAgent for replay mode, built from the same pieces as compare-screen.js (recordedPool, makeReplayChat, runGuarded).
// recorded = the parsed data/recorded-runs.json ({ free, constrained }). Run i uses seed seedBase + i, and the seed picks
// the recorded run as `|seed| % pool.length`, so runsPerCase equal to the pool size (5) visits each recorded run once.
// simple: the recorded free run. careful: the guarded agent replaying the constrained pool, rotated to start at that run;
// a retry reads the next run in the pool. Add a delay in your own wrapper if the screen should animate.
export function replayRunAgent(recorded, { seedBase = 0 } = {}) {
  const poolFor = (mode, caseId, seed) => {
    const pool = recorded[mode].filter((r) => r.caseId === caseId);
    if (pool.length === 0) throw new Error(`no recorded ${mode} runs for ${caseId}`);
    const at = Math.abs(seed) % pool.length;
    return [...pool.slice(at), ...pool.slice(0, at)];
  };
  return async (kind, c, runIndex) => {
    const seed = seedBase + runIndex;
    if (kind === "simple") return structuredClone(poolFor("free", c.id, seed)[0]);
    const { run } = await runGuarded(makeReplayChat(poolFor("constrained", c.id, seed)), c, {
      model: "recorded",
      seed,
    });
    return run;
  };
}
