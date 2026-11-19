// The Test set screen: run every question several times, draw the grid, open one run.
// Exports: onRunSet, onCellSelected.
import { CASES } from "../task/cases.js";
import { METRICS, scoreRun, summarizeGrid } from "../evals/engine.js";
import * as ui from "../ui/ui.js";
import { $, state, caseById, CARD_NAMES, expectedOf, showError, mark } from "./state.js";
import { runOne } from "./run-screen.js";
import { drawCurve } from "./compounding-screen.js";

function drawGrid() {
  if (state.grid) ui.renderGrid($("grid-view"), { ...state.grid, selected: state.cell });
}

function drawCell() {
  const { caseId, index } = state.cell;
  const c = caseById(caseId);
  const { run, scores } = state.cellRuns[caseId][index];
  const failed = METRICS.filter((m) => scores[m.id].pass === false);
  ui.renderCellRun($("cell-view"), {
    label: `${caseId} · run ${index + 1}`,
    passed: scores.task_success.pass === true,
    why: failed.length ? failed.map((m) => `${m.label}: ${scores[m.id].reason}.`).join(" ") : "",
    caseInfo: { id: c.id, query: c.query },
    run,
    scores,
    expected: expectedOf(c),
    cardNames: CARD_NAMES,
  });
}

export async function onRunSet() {
  const runsPerCase = Math.min(10, Math.max(1, Number($("set-runs").value) || 5));
  const results = [];
  state.gridRuns = [];
  state.cellRuns = {};
  state.cell = null;
  $("cell-view").replaceChildren();
  state.stop = false;
  $("run-set").disabled = true;
  $("stop-set").hidden = false;
  try {
    // Rows are added only when complete, so every row has the same number of cells.
    for (const c of CASES) {
      const row = { caseId: c.id, runs: [] };
      const cells = [];
      for (let j = 0; j < runsPerCase && !state.stop; j++) {
        $("set-progress").textContent =
          `${c.id}, run ${j + 1} of ${runsPerCase} (case ${results.length + 1} of ${CASES.length})`;
        const run = await runOne(c, 1000 + j, j);
        const scores = scoreRun(c, run);
        state.gridRuns.push(run);
        cells.push({ run, scores });
        row.runs.push(scores.task_success.pass === true);
      }
      if (state.stop) break;
      results.push(row);
      state.cellRuns[c.id] = cells;
      state.grid = { cases: CASES, results, summary: summarizeGrid(results) };
      drawGrid();
      drawCurve();
    }
    $("set-progress").textContent = state.stop
      ? `Stopped after ${results.length} cases.`
      : `Done: ${results.length} cases, ${runsPerCase} runs each. Click any square to open that run.`;
    if (results.length) mark("set");
  } catch (err) {
    showError($("grid-view"), err);
  } finally {
    $("run-set").disabled = false;
    $("stop-set").hidden = true;
  }
}

export function onCellSelected({ caseId, index }) {
  if (!state.cellRuns[caseId]?.[index]) return;
  state.cell = { caseId, index };
  drawGrid();
  drawCell();
  mark("cell");
  $("cell-view").scrollIntoView({ block: "start" });
}
