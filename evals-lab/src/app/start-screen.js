// The Start screen: the task diagram, the cards table, the demo rules, and the example-question buttons.
import { METRICS } from "../evals/engine.js";
import { CARDS, CATEGORIES, CATEGORY_LABELS, ASSUMPTIONS } from "../task/cases.js";
import { CUSTOM_EXAMPLES } from "../task/custom-question.js";
import { cardsMatrixHtml } from "../ui/cards-view.js";
import * as ui from "../ui/ui.js";

export function drawStart() {
  ui.renderMissions(new Set());
  ui.renderFlow(document.getElementById("start-flow"), { metrics: METRICS });
  document.getElementById("start-cards").innerHTML = cardsMatrixHtml({
    cards: CARDS, categories: CATEGORIES, labels: CATEGORY_LABELS,
    caption: "What each card earns back, as a percent of the amount spent. Longer bar = more reward.",
  });
  // The scenario the numbers were built on. The last assumption (not financial advice) is the closing line instead.
  const rules = ASSUMPTIONS.filter((a) => !/financial advice/i.test(a));
  document.getElementById("start-rules").innerHTML = `<h3 class="k">Rules of this demo</h3>` +
    `<ul>${rules.map((a) => `<li>${ui.escapeHtml(a)}</li>`).join("")}</ul>` +
    `<p class="muted">Rates come from the banks' own pages and were checked in November 2026; they change. Not financial advice.</p>`;
}

// Small buttons that put an example sentence in the text box (and tell the page the text changed).
export function fillExamples(root, input) {
  root.replaceChildren(...CUSTOM_EXAMPLES.map((text) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "sec ex";
    b.textContent = text;
    b.onclick = () => { input.value = text; input.dispatchEvent(new Event("input")); input.focus(); };
    return b;
  }));
}
