// Detail panel for one check on the Checks screen. Pure: returns an HTML string, no DOM.
// For the LLM judge it shows the exact prompt the model gets, built by judgePrompt() in engine.js.
const e = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

const WORD = { true: "PASS", false: "FAIL" };

// grader = { prompt: { system, user }, grades: [..] | null, median } for the LLM judge; null otherwise.
export function checkDetailHtml(metric, score, grader = null) {
  if (!metric) return "";
  const word = WORD[score?.pass] ?? "NOT RUN";
  const how =
    metric.id === "rubric_judge"
      ? "A second AI call, not plain code. The same small model gets the two messages below and answers with one number from 0 to 5. We ask 5 times and take the middle grade, because one answer can vary."
      : "Plain code. No AI is involved, so the same run always gets the same result.";
  const result = `<p class="sumrow"><span class="k">Result</span><b>${word}</b> ${score?.reason && score.reason.toLowerCase() !== word.toLowerCase() ? e(score.reason) : ""}</p>`;
  let extra = "";
  if (metric.id === "rubric_judge" && grader?.prompt) {
    const grades = grader.grades
      ? `<p class="sumrow"><span class="k">The 5 grades</span>${e(grader.grades.join(", "))} (middle grade: ${e(grader.median ?? "none")})</p>`
      : '<p class="sumrow"><span class="k">The 5 grades</span>not asked yet. Load the live model and press "Run the LLM judge".</p>';
    extra =
      `<h4>Message 1: system prompt (the judge's job)</h4><pre>${e(grader.prompt.system)}</pre>` +
      `<h4>Message 2: the thing to grade (built from the run you are looking at)</h4><pre>${e(grader.prompt.user)}</pre>` +
      `${grades}<p class="muted">Known weakness: this small model gave 5 out of 5 to every run we tried, even a run with a reward 10 times too high. That is why the page also has plain-code checks.</p>`;
  }
  return (
    `<section class="tile-detail" aria-live="polite"><h3>${e(metric.label)}</h3><p>${e(metric.blurb)}</p>` +
    `<p class="sumrow"><span class="k">How it is checked</span>${e(how)}</p>${result}${extra}</section>`
  );
}
