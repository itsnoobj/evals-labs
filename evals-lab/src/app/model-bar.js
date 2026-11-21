// The model bar: loading the model, its status and progress, and the copy of the bar on the Side by side screen.
// Exports: setNote, syncCmpModelBar, syncAsk, syncRunHint, enterMode, selectLive, ensureMode, onLoadModel.
import { CASES } from "../task/cases.js";
import { loadModel } from "../agent/llm.js";
import { modelBoxes } from "../ui/model-box.js";
import { modelStatusHtml } from "../ui/model-status.js";
import { makeCustomCase } from "../task/custom-question.js";
import { askState, runLine, runHint, typedHint, LOADING_TEXT } from "../ui/ask-row.js";
import { checkInput } from "../agent/guardrails.js";
import { $, state, mark, describeError } from "./state.js";

// True when the typed text has no amount or no shop this lab knows (the tools cannot answer it). "" is not unknown: nothing typed.
const typedUnknown = (text) => {
  const t = String(text ?? "").trim();
  if (!t) return false;
  const c = makeCustomCase(t);
  return c.merchant == null || c.amount == null;
};

// The slim bar under the top nav. Redrawn only when its HTML changed, so a focused button is not lost to a progress tick.
function drawStatusBar(kind, pct) {
  const html = modelStatusHtml({
    kind,
    pct,
    modelId: state.llm?.modelId,
    error: state.loadError,
    hadLive: Boolean(state.llm),
    hasRecorded: Boolean(state.recorded),
    secure: window.isSecureContext,
  });
  const bar = $("model-status-bar");
  if (bar.dataset.html !== html) {
    bar.dataset.html = html;
    bar.innerHTML = html;
  }
}

// Writes the words and markers inside the two boxes ("Live AI", "Recorded runs") from the mode kept on #model-bar.
function renderBoxes() {
  const bar = $("model-bar");
  const boxes = modelBoxes({
    kind: bar.dataset.kind,
    label: bar.dataset.label,
    pct: Number($("model-progress").getAttribute("aria-valuenow")),
    hadLive: Boolean(state.llm),
    hasRecorded: Boolean(state.recorded),
    selected: state.pref === "live" ? "live" : "",
  });
  const draw = (box, ids) => {
    $(ids.status).dataset.status = box.status;
    document.querySelector(`[data-hook=${ids.label}]`).textContent = box.label;
    $(ids.inUse).hidden = !box.inUse;
    $(ids.box).dataset.selected = box.inUse ? "1" : "";
  };
  draw(boxes.live, {
    status: "model-status",
    label: "model-status-label",
    inUse: "live-inuse",
    box: "choice-live",
  });
  draw(boxes.replay, {
    status: "replay-status",
    label: "replay-status-label",
    inUse: "replay-inuse",
    box: "choice-replay",
  });
}

function setStatus(kind, label) {
  $("model-bar").dataset.kind = kind;
  $("model-bar").dataset.label = label;
  // The download bar only means something while a download is going.
  $("model-progress").hidden = kind !== "loading";
  $("model-loading").hidden = kind !== "loading";
  syncCmpModelBar();
}
function setProgress(fraction) {
  const segs = [...$("model-progress").querySelectorAll(".seg")];
  const on = Math.floor(fraction * segs.length);
  segs.forEach((s, i) => s.classList.toggle("on", i < on));
  $("model-progress").setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
  syncCmpModelBar();
}
// Warnings and errors (warn: true) stay visible in the Live AI box. Everything else sits behind its closed "Details".
export const setNote = (text, { warn = false } = {}) => {
  $("model-warning").textContent = warn ? text : "";
  $("model-warning").hidden = !warn || !text;
  $("model-note").textContent = warn ? "" : text;
  $("model-details").hidden = warn || !text;
  syncCmpModelBar();
};

// The Side by side screen has its own copy of the model bar. It only mirrors the Run-screen state, so loading logic lives in one place.
export function syncCmpModelBar() {
  const kind = $("model-bar").dataset.kind;
  const label = $("model-bar").dataset.label;
  const pct = $("model-progress").getAttribute("aria-valuenow");
  // Load model: needs a secure page; while the live AI is the one running there is nothing left to load.
  $("load-model").disabled = !window.isSecureContext || kind === "loading" || state.mode === "live";
  renderBoxes();
  drawStatusBar(kind, Number(pct));
  const text =
    { ready: "Live model ready", replay: "Using recorded runs", loading: `Loading model ${pct}%` }[kind] ??
    (label === "Load failed"
      ? `${label}. ${$("model-warning").textContent}`
      : state.pref === "live"
        ? "Chosen, not loaded yet (loads on first ask)"
        : "No model loaded yet");
  $("cmp-model-status").dataset.status = kind;
  $("cmp-model-bar").dataset.chosen = kind === "ready" || kind === "replay" ? "1" : "";
  document.querySelector("[data-hook=cmp-model-label]").textContent = text;
  $("model-loading").textContent = `${LOADING_TEXT} ${pct}%`;
  $("cmp-load-model").disabled = $("load-model").disabled;
  $("cmp-use-replay").disabled = $("use-replay").disabled;
  $("cmp-model-progress").hidden = kind !== "loading";
  [...$("cmp-model-progress").children].forEach((s, i) =>
    s.classList.toggle("on", $("model-progress").children[i].classList.contains("on")),
  );
  // The one quiet "Running on" line under the question row, and its one text button.
  const line = runLine({
    kind,
    mode: state.mode,
    pref: state.pref,
    modelId: state.llm?.modelId,
    pct: Number(pct),
    error: state.loadError,
    demo: state.demo,
    recordedFailed: !!state.recordedFailed,
  });
  $("cmp-run-text").textContent = line.text;
  const sw = $("cmp-run-switch");
  sw.hidden = !line.button;
  if (line.button) {
    sw.textContent = line.button.label;
    sw.dataset.action = line.button.action;
    sw.disabled =
      state.cmpBusy || (line.button.action === "live" ? !window.isSecureContext : $("cmp-use-replay").disabled);
  }
  // Why recorded runs are the default (no WebGPU, insecure page, or the link asked for them). Gone once the live AI is chosen.
  const why = state.pref === "replay" && state.mode === "replay" ? state.fallbackReason : "";
  $("cmp-run-why").textContent = why;
  $("cmp-run-why").hidden = !why;
  syncRunHint();
  syncAsk();
}

// ASK BOTH and the reason next to it. Called whenever the question, the mode, a run or a result changes.
export function syncAsk() {
  const pref = state.pref;
  const st = askState({
    picked: $("cmp-case").value,
    typed: $("cmp-text").value,
    ran: !!state.cmp,
    busy: state.cmpBusy,
    ready: state.mode === "live" || state.mode === "replay" || pref === "live" || !state.recordedFailed,
    starting: state.mode === "none" && pref !== "live" && pref !== "failed" && !state.recordedFailed,
    loading: $("model-bar").dataset.kind === "loading",
    loadFailed: state.mode === "none" && pref === "failed",
    mode: state.mode,
    guardBlocks: !checkInput($("cmp-text").value.trim()).ok,
    unknown: typedUnknown($("cmp-text").value),
  });
  $("cmp-ask").disabled = st.disabled;
  $("cmp-ask-why").textContent = st.reason;
  $("cmp-ask-why").hidden = !st.reason;
}

// The hint next to RUN CASE on screen 1. A typed question in recorded mode has no recorded run (and no guardrail on this screen).
export function syncRunHint() {
  const early = runHint({
    kind: $("model-bar").dataset.kind,
    pct: Number($("model-progress").getAttribute("aria-valuenow")),
    mode: state.mode,
    pref: state.pref,
  });
  if (early) {
    $("run-hint").textContent = early;
    return;
  }
  if (state.mode === "none") return; // nothing chosen yet: the first hint stays
  $("run-hint").textContent =
    typedHint({
      typed: $("case-text").value,
      mode: state.mode,
      unknown: typedUnknown($("case-text").value),
    }) || "Runs the question from step 2.";
}

// quiet: the automatic first-visit choice, which the visitor did not make, so it does not tick the "Choose how to run" mission.
export function enterMode(mode, { quiet = false } = {}) {
  state.mode = mode;
  state.pref = mode;
  state.demo = false;
  state.loadError = "";
  setStatus(mode === "live" ? "ready" : "replay", mode === "live" ? "Ready (live model)" : "Replay (recorded runs)");
  setProgress(mode === "live" ? 1 : 0);
  $("temperature").disabled = mode === "replay";
  $("run-case").disabled = false;
  $("run-set").disabled = false;
  $("judge-run").disabled = mode !== "live";
  syncRunHint();
  $("set-progress").textContent = `${CASES.length} cases. Press Run the set.`;
  if (mode === "replay")
    setNote(
      "Replay: real runs of the real model, recorded earlier. Temperature is fixed; the seed picks which recorded run you see.",
    );
  if (!quiet) mark("engine");
}

// Live AI chosen: if it is already loaded it runs at once, else it is only SELECTED and loads on the first ask. No download here.
export function selectLive({ quiet = false } = {}) {
  if (state.llm) return enterMode("live", { quiet });
  state.mode = "none";
  state.pref = "live";
  state.demo = false;
  state.loadError = "";
  setStatus("not-loaded", "Not loaded");
  setProgress(0);
  setNote("");
  $("temperature").disabled = false;
  $("run-case").disabled = false;
  $("run-set").disabled = false;
  $("judge-run").disabled = true;
  syncRunHint();
  $("set-progress").textContent = `${CASES.length} cases. Press Run the set.`;
}

// Called first by every run button. Live AI chosen but not loaded: load it now (progress shows), then the caller goes on.
// Returns true when a way to run is ready. false: nothing to run on (the load failed, or a load is already going).
export async function ensureMode() {
  if (state.mode === "live" || state.mode === "replay") return true;
  if (state.pref !== "live") return false;
  return onLoadModel();
}

// Returns true when the live model is ready. On failure it shows the real error and offers recorded runs; it never switches by itself.
export async function onLoadModel() {
  if (state.llm) {
    enterMode("live");
    return true;
  }
  if ($("model-bar").dataset.kind === "loading") return false;
  const idle = state.mode === "none";
  state.loadError = "";
  if (idle) {
    $("run-case").disabled = true;
    $("run-set").disabled = true;
  }
  setStatus("loading", "Loading");
  try {
    const gpu = await state.gpuCheck;
    state.llm = await loadModel(gpu.modelId, (fraction, text) => {
      setProgress(fraction);
      setNote(text);
    });
    setNote("Ready. The model runs in your browser, nothing is sent anywhere.");
    enterMode("live");
    return true;
  } catch (err) {
    state.loadError = describeError(err);
    // Keep the bar on what is still running (recorded runs), else on "not loaded".
    setStatus(state.mode === "replay" ? "replay" : "not-loaded", "Load failed");
    setNote(`Could not load the model: ${state.loadError}. You can still use the recorded runs.`, { warn: true });
    if (idle) state.pref = "failed";
    syncCmpModelBar();
    return false;
  }
}
