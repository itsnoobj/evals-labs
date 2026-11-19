// The Errors add up screen: the per-step accuracy curve, the what-if slider and the retry control.
// Exports: drawCurve.
import { CASES } from "../task/cases.js";
import { perStepAccuracy, stepCorrectness } from "../evals/engine.js";
import * as ui from "../ui/ui.js";
import { $, state, caseById } from "./state.js";

const DEFAULT_P = 0.9; // starting value for the compounding slider before any run exists

export function drawCurve() {
  const measured = state.gridRuns.length ? perStepAccuracy(state.gridRuns, CASES) : null;
  const source = state.whatIf != null ? "whatif" : measured != null ? "measured" : "default";
  const p = state.whatIf ?? measured ?? DEFAULT_P;
  $("what-if").value = String(Math.round(p * 100));
  $("what-if-out").textContent = `${Math.round(p * 100)}%`;
  $("what-if-reset").hidden = !(source === "whatif" && measured != null);
  // Observed point for n steps: share of runs whose first n steps were all right. Only shown next to the measured prediction.
  const points =
    source !== "measured"
      ? []
      : [1, 2, 3].map((n) => ({
          n,
          value:
            state.gridRuns.filter((run) => {
              const ok = stepCorrectness(caseById(run.caseId), run);
              return ok.length >= n && ok.slice(0, n).every(Boolean);
            }).length / state.gridRuns.length,
        }));
  ui.renderCurve($("curve-view"), { p, n: 10, points, retryTries: Number($("retry-tries").value), source });
}
