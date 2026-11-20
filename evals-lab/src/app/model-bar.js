// The model bar: loading the model, its status and progress, and the copy of the bar on the Side by side screen.
// Exports: setNote, syncCmpModelBar, syncAsk, enterMode, onLoadModel.
import { CASES } from "../task/cases.js";
import { loadModel } from "../agent/llm.js";
import { modelBoxes } from "../ui/model-box.js";
import { tryTheseHtml, LIVE_ONLY, NOT_LOADED, LOADING } from "../ui/try-these.js";
import { askState, runLine, typedHint } from "../ui/ask-row.js";
import { checkInput } from "../agent/guardrails.js";
import { $, state, mark, describeError } from "./state.js";

// Writes the words and markers inside the two boxes ("Live AI", "Recorded runs") from the mode kept on #model-bar.
function renderBoxes() {
  const bar = $("model-bar");
  const boxes = modelBoxes({
    kind: bar.dataset.kind,
    label: bar.dataset.label,
    pct: Number($("model-progress").getAttribute("aria-valuenow")),
    hadLive: Boolean(state.llm),
    hasRecorded: Boolean(state.recorded),
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
  renderBoxes();
  const kind = $("model-bar").dataset.kind;
  const label = $("model-bar").dataset.label;
  const pct = $("model-progress").getAttribute("aria-valuenow");
  const text =
    { ready: "Live model ready", replay: "Using recorded runs", loading: `Loading model ${pct}%` }[kind] ??
    (label === "Load failed" ? `${label}. ${$("model-warning").textContent}` : "No model loaded yet");
  $("cmp-model-status").dataset.status = kind;
  $("cmp-model-bar").dataset.chosen = kind === "ready" || kind === "replay" ? "1" : "";
  document.querySelector("[data-hook=cmp-model-label]").textContent = text;
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
    modelId: state.llm?.modelId,
    pct: Number(pct),
    failed: label === "Load failed",
    recordedFailed: !!state.recordedFailed,
  });
  $("cmp-run-text").textContent = line.text;
  const sw = $("cmp-run-switch");
  sw.hidden = !line.button;
  if (line.button) {
    sw.textContent = line.button.label;
    sw.dataset.action = line.button.action;
    sw.disabled = state.cmpBusy || (line.button.action === "live" ? $("cmp-load-model") : $("cmp-use-replay")).disabled;
  }
  // The Try these buttons use recorded runs only. With the live model they stay disabled and say why in text.
  $("cmp-try").innerHTML = tryTheseHtml({
    disabledReason: state.mode === "live" ? LIVE_ONLY : kind === "loading" ? LOADING : state.recorded ? "" : NOT_LOADED,
  });
  syncAsk();
}

// ASK BOTH and the reason next to it. Called whenever the question, the mode, a run or a result changes.
export function syncAsk() {
  const ready = state.mode === "live" || state.mode === "replay" || !state.recordedFailed;
  const st = askState({
    picked: $("cmp-case").value,
    typed: $("cmp-text").value,
    ran: !!state.cmp,
    busy: state.cmpBusy,
    ready,
    starting: state.mode === "none" && !state.recordedFailed,
    mode: state.mode,
    guardBlocks: !checkInput($("cmp-text").value.trim()).ok,
  });
  $("cmp-ask").disabled = st.disabled;
  $("cmp-ask-why").textContent = st.reason;
  $("cmp-ask-why").hidden = !st.reason;
}

// The hint next to RUN CASE on screen 1. A typed question in recorded mode has no recorded run (and no guardrail on this screen).
export function syncRunHint() {
  const hint = typedHint({ typed: $("case-text").value, mode: state.mode });
  if (state.mode === "none") return; // step 1 is not done: the first hint stays
  $("run-hint").textContent = hint || "Runs the question from step 2.";
}

export function enterMode(mode) {
  state.mode = mode;
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
  mark("engine");
}

export async function onLoadModel() {
  $("load-model").disabled = true;
  setStatus("loading", "Loading");
  try {
    const gpu = await state.gpuCheck;
    state.llm = await loadModel(gpu.modelId, (fraction, text) => {
      setProgress(fraction);
      setNote(text);
    });
    setNote("Ready. The model runs in your browser, nothing is sent anywhere.");
    enterMode("live");
  } catch (err) {
    setStatus("not-loaded", "Load failed");
    setNote(`Could not load the model: ${describeError(err)}. You can still use the recorded runs.`, { warn: true });
    $("load-model").disabled = false;
    syncCmpModelBar();
  }
}
