// Explain dialog input for one check on the Checks screen (explain-dialog.js shows it). Pure: no DOM.
// IN THIS RUN shows what the engine returned for the check (score.pass and score.reason), nothing invented.
// For the LLM judge the closed section holds the exact prompt the model gets, built by judgePrompt() in engine.js.
import { MORE_EXPLAIN } from "./explainers-more.js";
import { nodeVisualHtml } from "./node-visuals.js";
import { runLinesHtml } from "./explain-dialog.js";

const e = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

export const checkWord = (score) => (score?.pass === true ? "PASS" : score?.pass === false ? "FAIL" : "NOT RUN");

const HOW_CODE = "Plain code. No AI is involved, so the same run always gets the same result.";
const HOW_JUDGE =
  "A second AI call, not plain code. The same small model gets the two messages below and answers with one number from 0 to 5. We ask 5 times and take the middle grade, because one answer can vary.";
const JUDGE_NOT_ASKED = 'Not asked yet. Load the live model and press "Run the LLM judge".';

// grader = { prompt: { system, user }, grades: [..] | null, median } for the LLM judge; null otherwise.
// note: which run is scored (plain text). bug: the injected bug { label } or null.
export function checkExplain(metric, score, { grader = null, note = "", bug = null } = {}) {
  if (!metric) return null;
  const word = checkWord(score);
  const isJudge = metric.id === "rubric_judge";
  const reason = isJudge && score?.pass == null ? JUDGE_NOT_ASKED : (score?.reason ?? "not run");
  const lines = [{ state: word, text: reason }];
  if (note) lines.push({ text: note });
  if (bug)
    lines.push({ state: "BUG ON", text: `${bug.label} is switched on, so this is the result for the changed run.` });

  const sections = [
    {
      summary: "How it is checked",
      html: `<p>${e(metric.blurb)}</p><p>${e(isJudge ? HOW_JUDGE : HOW_CODE)}</p>`,
      id: `explain-check-${metric.id}-how`,
    },
  ];
  if (isJudge && grader?.prompt) {
    const grades = grader.grades
      ? `${e(grader.grades.join(", "))} (middle grade: ${e(grader.median ?? "none")})`
      : "not asked yet";
    sections.push({
      summary: "The judge's prompt",
      html:
        `<h4 class="xp-h">Message 1: system prompt (the judge's job)</h4><pre class="xp-pre">${e(grader.prompt.system)}</pre>` +
        `<h4 class="xp-h">Message 2: the thing to grade (built from the run you are looking at)</h4><pre class="xp-pre">${e(grader.prompt.user)}</pre>` +
        `<p><b>The 5 grades:</b> ${grades}</p>` +
        `<p class="muted">Known weakness: this small model gave 5 out of 5 to every run we tried, even a run with a reward 10 times too high. That is why the page also has plain-code checks.</p>`,
      id: "explain-check-rubric_judge-prompt",
    });
  }
  return {
    title: metric.label,
    what: MORE_EXPLAIN[metric.id].what,
    why: MORE_EXPLAIN[metric.id].why,
    visualHtml: nodeVisualHtml(metric.id),
    thisRunHtml: runLinesHtml(lines),
    moreSections: sections,
  };
}
