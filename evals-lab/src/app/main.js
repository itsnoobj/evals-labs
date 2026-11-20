// Entry point (loaded by index.html): wires the pure pieces together and binds every control.
// model (llm.js) -> agent loop (agent-step.js) -> scores (engine.js) -> screens (src/app/*.js, ui.js). Exports nothing.
import { CASES, CARDS, CATEGORIES, CATEGORY_LABELS, DEFAULT_CASE_ID, MERCHANTS } from "../task/cases.js";
import { METRICS } from "../evals/engine.js";
import { checkWebGpu, defaultMode, forcedRecorded, MODE_KEY, MODEL_F16 } from "../agent/llm.js";
import * as ui from "../ui/ui.js";
import { cardsMatrixHtml } from "../ui/cards-view.js";
import { $, state, questionFor, NO_KEY_NOTE, CARD_NAMES, mark, describeError } from "./state.js";
import { setNote, syncCmpModelBar, syncAsk, syncRunHint, enterMode, selectLive, onLoadModel } from "./model-bar.js";
import { onRunCase } from "./run-screen.js";
import { drawMetrics, onTileSelected, onBugSelected, onJudge } from "./metrics-screen.js";
import { onRunSet, onCellSelected } from "./golden-screen.js";
import { drawCurve } from "./compounding-screen.js";
import { drawChats, onAskBoth, onClearResults, onTryThis, onScoreBoth, onStopScore } from "./compare-screen.js";
import { drawWiring, loadDspy, bindWiringRoots, openWiringNode } from "./wiring-panel.js";
import { drawStart } from "./start-screen.js";
import { initNav } from "./nav.js";
import { installDisclose } from "../ui/disclose.js";
import { glossaryHtml } from "../ui/glossary.js";
import { exampleChips, exampleChipsHtml, knownShops } from "../ui/example-chips.js";

// The long explanation of live and recorded runs sits in the "Live or recorded?" section of index.html.
// The note line under the model bar shows only warnings, progress and errors.
// enterMode() writes a long replay note under the model bar; that text is in the "Live or recorded?" section.
const useReplay = (opts) => {
  enterMode("replay", opts);
  setNote("");
};

// ?mode=recorded forces recorded runs (headless tests, demos, a phone with no WebGPU) and is remembered for the tab;
// ?mode=live clears it. A browser that blocks sessionStorage still honours the link.
function readForcedRecorded() {
  const asked = new URLSearchParams(location.search).get("mode");
  try {
    if (asked === "recorded") sessionStorage.setItem(MODE_KEY, "recorded");
    else if (asked === "live") sessionStorage.removeItem(MODE_KEY);
    return forcedRecorded(location.search, sessionStorage.getItem(MODE_KEY) ?? "");
  } catch {
    return forcedRecorded(location.search, "");
  }
}

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
  // "Use the live AI" only chooses it: nothing downloads until the first ask. "Use recorded runs" switches at once.
  $("cmp-run-switch").onclick = () => ($("cmp-run-switch").dataset.action === "live" ? selectLive() : useReplay());
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
    syncRunHint();
    drawMetrics();
  };
  $("case-text").oninput = () => {
    showQuestion();
    syncRunHint();
  };
  // Example chips are real test-set cases: a click only picks the case (the same as the list). The chips appear once the recorded runs are read.
  const shops = knownShops(MERCHANTS, CASES).join(", ");
  $("case-shops").textContent = shops;
  $("cmp-shops").textContent = shops;
  const pickExample = (selectId, ev) => {
    const b = ev.target.closest("button[data-example]");
    if (!b || b.disabled || state.cmpBusy) return;
    $(selectId).value = b.dataset.example;
    $(selectId).onchange();
  };
  $("case-examples").addEventListener("click", (ev) => pickExample("case-select", ev));
  $("cmp-examples").addEventListener("click", (ev) => {
    pickExample("cmp-case", ev);
    if (ev.target.closest("button[data-example]")) $("cmp-ask").focus({ preventScroll: true });
  });
  // The status bar under the nav: one listener, its buttons are redrawn with every status change.
  $("model-status-bar").addEventListener("click", (ev) => {
    const b = ev.target.closest("button[data-mstat]");
    if (!b || b.disabled || state.cmpBusy) return;
    if (b.dataset.mstat === "load") onLoadModel();
    else useReplay();
  });
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
  // The first option is the empty placeholder, so no question is chosen on arrival.
  $("cmp-case").replaceChildren(
    new Option("Pick a question...", ""),
    ...CASES.map((c) => new Option(`${c.id}  ${c.query}`, c.id)),
  );
  $("cmp-case").value = "";
  // A result stays on screen until the next Ask both or CLEAR RESULTS; changing the question only enables ASK BOTH.
  const cmpQuestionChanged = () => {
    drawChats();
    syncAsk();
  };
  $("cmp-case").onchange = () => {
    $("cmp-text").value = "";
    cmpQuestionChanged();
  };
  $("cmp-text").oninput = cmpQuestionChanged;
  $("cmp-ask").onclick = () => onAskBoth();
  $("cmp-clear").onclick = onClearResults;
  // The steps of the two step bars open the same pop-up as the wiring boxes. The chats are redrawn, so one listener on their container.
  $("cmp-root").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-sb-node]");
    if (btn) openWiringNode(btn.dataset.sbKind, btn.dataset.sbNode);
  });
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
  // syncCmpModelBar() (called here, before any await) disables Load model on an insecure page.
  syncCmpModelBar();
  if (!window.isSecureContext) {
    const fixUrl =
      location.protocol === "file:"
        ? "http://localhost:8000/"
        : `http://localhost${location.port ? `:${location.port}` : ""}${location.pathname}`;
    ui.renderOriginWarning($("origin-warning"), { origin: location.origin, fixUrl });
  }
  // Start reading the recorded runs now, so the Side by side screen is ready as soon as possible.
  const recordedLoad = fetch("data/recorded-runs.json")
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      state.recorded = data;
      $("use-replay").disabled = false;
      syncCmpModelBar();
      // The chip picks and captions are computed from these recorded runs. A failure here only means no chips.
      exampleChips(data, CASES)
        .then((chips) => {
          const html = exampleChipsHtml(chips);
          $("case-examples").innerHTML = html;
          $("cmp-examples").innerHTML = html;
        })
        .catch(() => {});
      return null;
    })
    .catch((err) => err);
  state.gpuCheck = checkWebGpu();
  state.gpu = await state.gpuCheck;

  const recordedError = await recordedLoad;
  // The first-visit choice: the live AI when this browser can run it (nothing is downloaded yet), else recorded runs.
  const first = defaultMode({ webgpu: state.gpu.ok, secure: window.isSecureContext, forced: readForcedRecorded() });
  state.fallbackReason = first.reason;
  if (first.mode === "live") selectLive({ quiet: true });
  else {
    state.pref = "replay";
    if (state.recorded) useReplay({ quiet: true });
  }
  syncCmpModelBar();
  // The warning goes in after the choice: choosing recorded runs clears the note under the model bar.
  if (!state.gpu.ok)
    setNote(`Warning: ${state.gpu.reason}${window.isSecureContext ? " You can still try Load model." : ""}`, {
      warn: true,
    });
  if (recordedError) {
    // Opening index.html as a file:// URL lands here: browsers block module and fetch requests there.
    state.recordedFailed = true;
    syncCmpModelBar();
    if (!state.gpu.ok)
      setNote(
        `Warning: ${state.gpu.reason} Recorded runs could not load (${describeError(recordedError)}). Serve this folder over http.`,
        { warn: true },
      );
  }
}

init();
