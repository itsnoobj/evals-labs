// Entry point (loaded by index.html): wires the pure pieces together and binds every control.
// model (llm.js) -> agent loop (agent-step.js) -> scores (engine.js) -> screens (src/app/*.js, ui.js). Exports nothing.
import { CASES, CARDS, CATEGORIES, CATEGORY_LABELS, DEFAULT_CASE_ID } from "../task/cases.js";
import { METRICS } from "../evals/engine.js";
import { checkWebGpu, MODEL_F16 } from "../agent/llm.js";
import * as ui from "../ui/ui.js";
import { cardsMatrixHtml } from "../ui/cards-view.js";
import { $, state, questionFor, NO_KEY_NOTE, CARD_NAMES, mark, describeError } from "./state.js";
import { setNote, syncCmpModelBar, enterMode, onLoadModel } from "./model-bar.js";
import { onRunCase } from "./run-screen.js";
import { drawMetrics, onTileSelected, onBugSelected, onJudge } from "./metrics-screen.js";
import { onRunSet, onCellSelected } from "./golden-screen.js";
import { drawCurve } from "./compounding-screen.js";
import { drawChats, onAskBoth, onTryThis, onScoreBoth, onStopScore } from "./compare-screen.js";
import { drawWiring, loadDspy, bindWiringRoots } from "./wiring-panel.js";
import { drawStart, fillExamples } from "./start-screen.js";
import { initNav } from "./nav.js";
import { installDisclose } from "../ui/disclose.js";
import { glossaryHtml } from "../ui/glossary.js";

// The long explanation of live and recorded runs sits in the "Live or recorded?" section of index.html.
// The note line under the model bar shows only warnings, progress and errors.
// enterMode() writes a long replay note under the model bar; that text is in the "Live or recorded?" section.
const useReplay = () => {
  enterMode("replay");
  setNote("");
  $("cmp-hint").textContent = "Pick a question and press Ask both.";
};

async function init() {
  installDisclose();
  // One closed "Words used here" section per screen. The containers sit outside every redrawn area, so they stay put.
  for (const key of ["run", "checks", "golden", "errors", "compare"]) $(`gloss-${key}`).innerHTML = glossaryHtml(key);
  ui.showScreenFromHash();
  initNav();
  drawStart();
  const showQuestion = () => {
    const c = questionFor("case-select", "case-text");
    $("case-question").textContent = c.query;
    if (c.custom) {
      $("case-cards").innerHTML =
        `<p class="muted nokey">${NO_KEY_NOTE} There is no answer table for it. The run still shows every step, and the checks that need a key show NOT RUN.</p>`;
      return;
    }
    $("case-cards").innerHTML = cardsMatrixHtml({
      cards: CARDS,
      categories: CATEGORIES,
      selectedCategory: c.expected.category,
      bestCard: c.expected.accept,
      labels: CATEGORY_LABELS,
      caption: `Answer key for ${c.id}: the agent must work out the category, then pick the best card${c.expected.accept.length > 1 ? " (two cards tie, either is right)" : ""}. Rates are percent back.`,
    });
  };
  $("case-select").replaceChildren(...CASES.map((c) => new Option(`${c.id}  ${c.query}`, c.id)));
  $("case-select").disabled = false;
  $("case-select").value = DEFAULT_CASE_ID;
  showQuestion();
  $("model-name").textContent = MODEL_F16.replace("-q4f16_1-MLC", "");

  $("load-model").onclick = onLoadModel;
  $("cmp-load-model").onclick = onLoadModel;
  $("cmp-use-replay").onclick = useReplay;
  $("run-case").onclick = onRunCase;
  $("run-set").onclick = onRunSet;
  $("stop-set").onclick = () => {
    state.stop = true;
  };
  $("judge-run").onclick = onJudge;
  $("metrics-base").onchange = drawMetrics;
  $("case-select").onchange = () => {
    $("case-text").value = "";
    showQuestion();
    drawMetrics();
  };
  $("case-text").oninput = showQuestion;
  fillExamples($("case-examples"), $("case-text"));
  fillExamples($("cmp-examples"), $("cmp-text"));
  $("retry-tries").onchange = () => {
    drawCurve();
    mark("tries");
  };
  $("what-if").oninput = () => {
    state.whatIf = Number($("what-if").value) / 100;
    drawCurve();
    mark("whatif");
  };
  $("what-if-reset").onclick = () => {
    state.whatIf = null;
    drawCurve();
  };
  $("metrics-view").addEventListener("tile-selected", (ev) => onTileSelected(ev.detail.metricId));
  $("metrics-view").addEventListener("bug-selected", (ev) => onBugSelected(ev.detail.bugId));
  $("grid-view").addEventListener("cell-selected", (ev) => onCellSelected(ev.detail));
  $("use-replay").onclick = useReplay;
  $("cmp-case").replaceChildren(...CASES.map((c) => new Option(`${c.id}  ${c.query}`, c.id)));
  $("cmp-case").value = DEFAULT_CASE_ID; // drawChats() below draws the chats for it
  const cmpQuestionChanged = () => {
    state.cmp = null;
    $("cmp-summary").hidden = true;
    drawChats();
  };
  $("cmp-case").onchange = () => {
    $("cmp-text").value = "";
    cmpQuestionChanged();
  };
  $("cmp-text").oninput = cmpQuestionChanged;
  $("cmp-ask").onclick = onAskBoth;
  // The Try these buttons are redrawn by the model bar, so one listener on their container handles them.
  $("cmp-try").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-try]");
    if (btn && !btn.disabled) onTryThis(btn.dataset.try);
  });
  $("cmp-score-start").onclick = onScoreBoth;
  $("cmp-score-stop").onclick = onStopScore;
  $("show-wiring").onchange = () => {
    const on = $("show-wiring").checked;
    $("cmp-root").classList.toggle("show-wiring", on);
    if (on) {
      mark("wiring");
      loadDspy();
    }
    drawWiring();
  };
  bindWiringRoots();
  drawChats();

  ui.renderFlow($("run-flow"), { metrics: METRICS, cardNames: CARD_NAMES });
  drawMetrics(); // works with no model: it scores a perfect scripted run
  drawCurve(); // works with no runs: it draws the what-if value

  // WebGPU and crypto.randomUUID (used by WebLLM) exist only on secure pages: https or http://localhost.
  // Decide this before any await so a slow GPU check can never leave the button disabled.
  $("load-model").disabled = !window.isSecureContext;
  syncCmpModelBar();
  if (!window.isSecureContext) {
    const fixUrl =
      location.protocol === "file:"
        ? "http://localhost:8000/"
        : `http://localhost${location.port ? `:${location.port}` : ""}${location.pathname}`;
    ui.renderOriginWarning($("origin-warning"), { origin: location.origin, fixUrl });
  }
  state.gpuCheck = checkWebGpu();
  state.gpu = await state.gpuCheck;
  if (!state.gpu.ok)
    setNote(`Warning: ${state.gpu.reason}${window.isSecureContext ? " You can still try Load model." : ""}`);

  try {
    const res = await fetch("data/recorded-runs.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    state.recorded = await res.json();
    $("use-replay").disabled = false;
    syncCmpModelBar();
  } catch (err) {
    // Opening index.html as a file:// URL lands here: browsers block module and fetch requests there.
    if (!state.gpu.ok)
      setNote(
        `Warning: ${state.gpu.reason} Recorded runs could not load (${describeError(err)}). Serve this folder over http.`,
      );
  }
}

init();
