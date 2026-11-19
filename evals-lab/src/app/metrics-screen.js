// The Checks screen: the checks, the bug injector, the AI grader button and its flow.
// Exports: drawMetrics, onBugSelected, onJudge.
import { perfectRun } from "../task/cases.js";
import { METRICS, BUGS, scoreRun, injectBug, judgePrompt, parseJudge } from "../evals/engine.js";
import { stageStates, BUG_STAGE } from "../ui/lessons.js";
import * as ui from "../ui/ui.js";
import { checkDetailHtml } from "../ui/check-details.js";
import { judgeFlowHtml } from "../ui/judge-flow.js";
import { $, state, caseById, NO_KEY_NOTE, mark, describeError } from "./state.js";

export function drawMetrics() {
  const useModel = $("metrics-base").value === "model" && state.last;
  // The scripted perfect run needs an answer key, so it always uses the list question, never typed text.
  const c = useModel ? state.last.c : caseById($("case-select").value);
  const base = useModel ? state.last.run : perfectRun(c);
  let run = base;
  let scores;
  let note = c.custom
    ? `Scoring your last run of your own question. ${NO_KEY_NOTE} The checks that need an answer key show NOT RUN.`
    : `Scoring ${useModel ? "your last run" : "a perfect scripted run"} of ${c.id}.`;
  try {
    if (state.bugId) run = injectBug(c, base, state.bugId);
    const judge = state.judge?.key === JSON.stringify(run.steps) ? state.judge : null;
    scores = scoreRun(c, run, judge ? { judge: { score: judge.median } } : {});
    if (judge) scores.rubric_judge.reason = `five grades: ${judge.all.join(", ")}`;
  } catch {
    // Some bugs need a final answer or a rank_cards step that a failed model run does not have.
    note = c.custom
      ? "Bugs need an answer key, so they cannot be added to your own question. Pick the perfect scripted run to use them."
      : "That bug cannot be applied to this run. Pick the perfect scripted run to use every bug.";
    run = base;
    scores = scoreRun(c, base);
    state.bugId = null;
  }
  state.metricsCtx = { c, run };
  $("metrics-note").textContent = note;
  ui.renderFlow($("metrics-flow"), {
    states: stageStates(c, run, { scores }),
    metrics: METRICS,
    scores,
    chips: true,
    bugStage: state.bugId ? BUG_STAGE[state.bugId] : null,
  });
  const picked = METRICS.find((m) => m.id === state.tileId);
  const judged = state.judge?.key === JSON.stringify(run.steps) ? state.judge : null;
  $("judge-flow-view").innerHTML = judgeFlowHtml({
    prompt: judgePrompt(c, run),
    grades: judged?.all ?? null,
    median: judged?.median ?? null,
  });
  const grader =
    picked?.id === "rubric_judge"
      ? { prompt: judgePrompt(c, run), grades: judged?.all ?? null, median: judged?.median ?? null }
      : null;
  ui.renderMetrics($("metrics-view"), {
    metrics: METRICS,
    bugs: BUGS,
    scores,
    activeBug: state.bugId,
    selected: picked?.id ?? null,
    detailHtml: checkDetailHtml(picked, scores[picked?.id], grader),
  });
}

export function onBugSelected(bugId) {
  state.bugId = bugId;
  drawMetrics();
  if (!state.bugId) return;
  state.bugsTried.add(state.bugId);
  mark("bug");
  if (state.bugsTried.size >= 3) mark("bugs3");
}

export async function onJudge() {
  const { c, run } = state.metricsCtx;
  const { system, user } = judgePrompt(c, run);
  $("judge-run").disabled = true;
  $("metrics-note").textContent = "Asking the AI to grade the answer five times…";
  try {
    const all = [];
    for (let i = 0; i < 5; i++) {
      const reply = await state.llm.chat({
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        temperature: 0.7,
        seed: 200 + i,
        max_tokens: 8,
      });
      all.push(parseJudge(reply.text).score);
    }
    const valid = all.filter((s) => s !== null).sort((a, b) => a - b);
    state.judge = {
      key: JSON.stringify(run.steps),
      all: all.map((s) => s ?? "?"),
      median: valid.length ? valid[Math.floor((valid.length - 1) / 2)] : null,
    };
    drawMetrics();
    mark("judge");
  } catch (err) {
    $("metrics-note").textContent = `The AI grader failed: ${describeError(err)}`;
  } finally {
    $("judge-run").disabled = state.mode !== "live";
  }
}
