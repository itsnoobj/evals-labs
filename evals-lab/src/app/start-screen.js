// The Start screen: the task picture, the four cards, the rates table, the demo rules, and the example-question buttons.
import { METRICS } from "../evals/engine.js";
import { CARDS, CATEGORIES, CATEGORY_LABELS, ASSUMPTIONS } from "../task/cases.js";
import { cardsMatrixHtml } from "../ui/cards-view.js";
import { openExplain } from "../ui/explain-dialog.js";
import { STAGES } from "../ui/lessons.js";
import { startVisualHtml } from "../ui/start-visual.js";
import * as ui from "../ui/ui.js";

export function drawStart() {
  ui.renderMissions(new Set());
  const visual = document.getElementById("start-visual");
  visual.innerHTML = startVisualHtml({ metricCount: METRICS.length });
  // Clicking a box opens the same explain dialog as the Run screen, with no run yet.
  visual.querySelectorAll("[data-stage]").forEach((b) => {
    b.onclick = () => {
      const st = STAGES.find((s) => s.id === b.dataset.stage);
      openExplain(ui.stageExplain(st, { metrics: METRICS }), {
        returnFocus: () => visual.querySelector(`[data-stage="${st.id}"]`),
      });
    };
  });
  document.getElementById("start-cards").innerHTML = cardsMatrixHtml({
    cards: CARDS,
    categories: CATEGORIES,
    labels: CATEGORY_LABELS,
    caption: "What each card earns back, as a percent of the amount spent. Longer bar = more reward.",
  });
  // The scenario the numbers were built on. The last assumption (not financial advice) is the closing line instead.
  const rules = ASSUMPTIONS.filter((a) => !/financial advice/i.test(a));
  document.getElementById("start-rules").innerHTML =
    `<h3 class="k">Rules of this demo</h3>` +
    `<ul>${rules.map((a) => `<li>${ui.escapeHtml(a)}</li>`).join("")}</ul>` +
    `<p class="muted">Rates come from the banks' own pages and were checked in November 2026; they change. Not financial advice.</p>`;
}
