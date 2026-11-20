// The Run screen: run one question (live or recorded) and draw the steps and the flow diagram.
// Exports: runOne (also used by the Test set), onRunCase.
import { METRICS, scoreRun } from "../evals/engine.js";
import { runCase } from "../agent/agent-step.js";
import { stageStates } from "../ui/lessons.js";
import * as ui from "../ui/ui.js";
import { $, state, sleep, questionFor, NEEDS_LIVE_NOTE, CARD_NAMES, expectedOf, showError, mark } from "./state.js";
import { drawMetrics } from "./metrics-screen.js";

function pickRecorded(caseId, index) {
  const pool = state.recorded[$("constrain").checked ? "constrained" : "free"].filter((r) => r.caseId === caseId);
  return structuredClone(pool[Math.abs(index) % pool.length]);
}

// onStep(steps) is called as steps arrive. Replay fakes the pacing so the diagram visibly lights up box by box.
export async function runOne(c, seed, replayIndex, { onStep } = {}) {
  if (state.mode === "replay") {
    const run = pickRecorded(c.id, replayIndex);
    if (!onStep) {
      await sleep(250);
      return run;
    }
    for (let i = 1; i <= run.steps.length; i++) {
      await sleep(700);
      onStep(run.steps.slice(0, i));
    }
    return run;
  }
  return runCase(state.llm.chat, c, {
    model: state.llm.modelId,
    seed,
    temperature: Number($("temperature").value),
    constrain: $("constrain").checked,
    onStep,
  });
}

const sumOf = (steps, key) => steps.reduce((total, s) => total + s[key], 0);

function drawRunFlow(c, run, opts = {}) {
  ui.renderFlow($("run-flow"), {
    states: run ? stageStates(c, run, opts) : null,
    metrics: METRICS,
    scores: opts.scores ?? null,
    run,
    query: c.query,
    cardNames: CARD_NAMES,
  });
}

export async function onRunCase() {
  const c = questionFor("case-select", "case-text");
  if (c.custom && state.mode !== "live") {
    // Recorded runs exist only for the six test questions.
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = NEEDS_LIVE_NOTE;
    $("run-view").replaceChildren(p);
    return;
  }
  const seed = Number($("seed").value);
  const info = { id: c.id, query: c.query, custom: !!c.custom };
  const model = state.mode === "live" ? state.llm.modelId : "recorded";
  const showPartial = (steps) => {
    const run = {
      caseId: c.id,
      model,
      steps: steps.slice(),
      totalMs: sumOf(steps, "ms"),
      totalTokens: sumOf(steps, "tokens"),
    };
    ui.renderRun($("run-view"), {
      caseInfo: info,
      run,
      scores: null,
      expected: expectedOf(c),
      pending: true,
      cardNames: CARD_NAMES,
    });
    drawRunFlow(c, run, { running: true });
  };
  $("run-case").disabled = true;
  showPartial([]);
  try {
    const run = await runOne(c, seed, seed, { onStep: showPartial });
    const scores = scoreRun(c, run);
    state.last = { c, run };
    state.judge = null;
    ui.renderRun($("run-view"), { caseInfo: info, run, scores, expected: expectedOf(c), cardNames: CARD_NAMES });
    drawRunFlow(c, run, { scores });
    drawMetrics();
    mark("ran");
    if ($("constrain").checked) mark("guard");
  } catch (err) {
    showError($("run-view"), err);
  } finally {
    $("run-case").disabled = false;
  }
}
