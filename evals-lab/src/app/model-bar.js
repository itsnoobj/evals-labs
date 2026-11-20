// The model bar: loading the model, its status and progress, and the copy of the bar on the Side by side screen.
// Exports: setNote, syncCmpModelBar, enterMode, onLoadModel.
import { CASES } from "../task/cases.js";
import { loadModel } from "../agent/llm.js";
import { $, state, mark, describeError } from "./state.js";

function setStatus(kind, label) {
  $("model-status").dataset.status = kind;
  document.querySelector("[data-hook=model-status-label]").textContent = label;
  syncCmpModelBar();
}
function setProgress(fraction) {
  const segs = [...$("model-progress").querySelectorAll(".seg")];
  const on = Math.floor(fraction * segs.length);
  segs.forEach((s, i) => s.classList.toggle("on", i < on));
  $("model-progress").setAttribute("aria-valuenow", String(Math.round(fraction * 100)));
  syncCmpModelBar();
}
export const setNote = (text) => {
  $("model-note").textContent = text;
  syncCmpModelBar();
};

// The Side by side screen has its own copy of the model bar. It only mirrors the Run-screen elements, so loading logic lives in one place.
export function syncCmpModelBar() {
  const kind = $("model-status").dataset.status;
  const label = document.querySelector("[data-hook=model-status-label]").textContent;
  const pct = $("model-progress").getAttribute("aria-valuenow");
  const text =
    { ready: "Live model ready", replay: "Using recorded runs", loading: `Loading model ${pct}%` }[kind] ??
    (label === "Load failed" ? `${label}. ${$("model-note").textContent}` : "No model loaded yet");
  $("cmp-model-status").dataset.status = kind;
  document.querySelector("[data-hook=cmp-model-label]").textContent = text;
  $("cmp-load-model").disabled = $("load-model").disabled;
  $("cmp-use-replay").disabled = $("use-replay").disabled;
  $("cmp-model-progress").hidden = kind !== "loading";
  [...$("cmp-model-progress").children].forEach((s, i) =>
    s.classList.toggle("on", $("model-progress").children[i].classList.contains("on")),
  );
}

export function enterMode(mode) {
  state.mode = mode;
  setStatus(mode === "live" ? "ready" : "replay", mode === "live" ? "Ready (live model)" : "Replay (recorded runs)");
  setProgress(mode === "live" ? 1 : 0);
  $("temperature").disabled = mode === "replay";
  $("run-case").disabled = false;
  $("run-hint").textContent = "Runs the question from step 2.";
  $("run-set").disabled = false;
  $("cmp-ask").disabled = false;
  $("cmp-hint").textContent =
    mode === "replay"
      ? "Recorded runs, run number 0. The preselected question (C05, the BESCOM electricity bill) shows the gap: the agent without evals gets it wrong and the agent with evals gets it right on the first try. For a retry, set the run number to 1 on the Run screen (Settings) and ask C01 (Amazon): the agent without evals is wrong and the agent with evals needs a second try."
      : "Pick a question and press Ask both. Live answers vary from run to run.";
  $("judge-run").disabled = mode !== "live";
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
    setNote(`Could not load the model: ${describeError(err)}. You can still use the recorded runs.`);
    $("load-model").disabled = false;
    syncCmpModelBar();
  }
}
