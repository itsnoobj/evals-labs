// The Checks screen: the checks, the bug injector, the LLM judge button and its flow.
// Clicking a check tile opens the explain dialog (ui/explain-dialog.js) with the data of the last redraw.
// Exports: drawMetrics, onTileSelected, onBugSelected, onJudge.
import { perfectRun } from "../task/cases.js";
import { METRICS, BUGS, scoreRun, injectBug, judgePrompt } from "../evals/engine.js";
import { gradeFiveTimes } from "../agent/ai-grader.js";
import { stageStates, BUG_STAGE } from "../ui/lessons.js";
import * as ui from "../ui/ui.js";
import { checkExplain } from "../ui/check-details.js";
import { openExplain } from "../ui/explain-dialog.js";
import { judgeFlowHtml } from "../ui/judge-flow.js";
import { $, state, caseById, NO_KEY_NOTE, CARD_NAMES, mark, describeError } from "./state.js";

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
  const judged = state.judge?.key === JSON.stringify(run.steps) ? state.judge : null;
  state.metricsCtx = { c, run, scores, note, judged };
  $("metrics-note").textContent = note;
  ui.renderFlow($("metrics-flow"), {
    states: stageStates(c, run, { scores }),
    metrics: METRICS,
    scores,
    chips: true,
    bugStage: state.bugId ? BUG_STAGE[state.bugId] : null,
    run,
    query: c.query,
    cardNames: CARD_NAMES,
  });
  $("judge-flow-view").innerHTML = judgeFlowHtml({
    prompt: judgePrompt(c, run),
    grades: judged?.all ?? null,
    median: judged?.median ?? null,
  });
  ui.renderMetrics($("metrics-view"), { metrics: METRICS, bugs: BUGS, scores, activeBug: state.bugId });
}

// Open the dialog for one check. It shows the scores of the last redraw; nothing can change them while it is open.
export function onTileSelected(metricId) {
  const metric = METRICS.find((m) => m.id === metricId);
  const ctx = state.metricsCtx;
  if (!metric || !ctx) return;
  const grader =
    metric.id === "rubric_judge"
      ? {
          prompt: judgePrompt(ctx.c, ctx.run),
          grades: ctx.judged?.all ?? null,
          median: ctx.judged?.median ?? null,
        }
      : null;
  const bug = BUGS.find((b) => b.id === state.bugId) ?? null;
  openExplain(checkExplain(metric, ctx.scores[metric.id], { grader, note: ctx.note, bug }), {
    returnFocus: () => $("metrics-view").querySelector(`[data-tile="${metric.id}"]`),
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
  $("judge-run").disabled = true;
  $("metrics-note").textContent = "Asking the LLM judge 5 times…";
  try {
    state.judge = { key: JSON.stringify(run.steps), ...(await gradeFiveTimes(state.llm.chat, c, run)) };
    drawMetrics();
    mark("judge");
  } catch (err) {
    $("metrics-note").textContent = `The LLM judge failed: ${describeError(err)}`;
  } finally {
    $("judge-run").disabled = state.mode !== "live";
  }
}
