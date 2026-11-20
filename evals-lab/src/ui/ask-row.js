// Words and state for the one call-to-action row on Side by side: the ASK BOTH button and the "Running on" line.
// Pure: plain data in, plain data out. No DOM. Exports: PICK_FIRST, PICK_ANOTHER, STARTING, LOADING_TEXT, TYPED_NEEDS_LIVE,
// TYPED_GUARD_ONLY, typedHint, askState, shortModelName, runLine, runHint.

export const PICK_FIRST = "Pick a question first.";
export const PICK_ANOTHER = "Pick another question to ask again.";
export const BUSY = "A run is going. Wait for it to finish.";
export const NOT_READY = 'Recorded runs did not load. Open "Change how it runs" below.';

export const STARTING = "Getting ready. Wait a moment.";
export const LOADING_WAIT = "Loading the AI. Wait for it to finish.";
export const LOAD_FAILED = 'The live AI did not load. Press "Use recorded runs" under the question box.';
// Shown while the model downloads, on both screens. The percent is added by the caller.
export const LOADING_TEXT = "Loading the AI: first use downloads about 880 MB, then it is cached.";
// Recorded runs exist only for the six test questions, so a typed question in recorded mode cannot be answered.
// Said next to the button BEFORE the click, so the click never looks like a no-op.
export const TYPED_NEEDS_LIVE =
  "Recorded runs cannot answer a typed question. Load the live AI, or pick a test question from the list.";
export const TYPED_GUARD_ONLY =
  "Recorded runs cannot answer a typed question. A guardrail stops this one before the model, so only the agent with evals shows a result.";

// "" when nothing needs saying. typed: the text box. mode: "none" | "replay" | "live".
// guardBlocks: the guardrail would stop this text (no model call, so recorded mode can still show it).
export function typedHint({ typed = "", mode = "", guardBlocks = false } = {}) {
  if (!String(typed).trim() || mode !== "replay") return "";
  return guardBlocks ? TYPED_GUARD_ONLY : TYPED_NEEDS_LIVE;
}

// picked: the chosen list value ("" = the placeholder). typed: the text box. ran: a result is on screen.
// ready: a way to run exists (recorded runs loaded, or the live model ready). busy: a run is going.
// starting: no mode is chosen yet (the first check or the recorded runs are still loading). mode, guardBlocks: see typedHint.
// loading: the live AI is downloading. loadFailed: it did not load and nothing else is chosen yet.
// Returns { disabled, reason }. The reason is shown next to the button; an enabled button can carry a hint (typed text in recorded mode).
export function askState({
  picked = "",
  typed = "",
  ran = false,
  busy = false,
  ready = true,
  starting = false,
  loading = false,
  loadFailed = false,
  mode = "",
  guardBlocks = false,
} = {}) {
  if (loading) return { disabled: true, reason: LOADING_WAIT };
  if (loadFailed) return { disabled: true, reason: LOAD_FAILED };
  if (busy) return { disabled: true, reason: BUSY };
  if (!ready) return { disabled: true, reason: NOT_READY };
  if (starting) return { disabled: true, reason: STARTING };
  if (String(typed).trim()) return { disabled: false, reason: typedHint({ typed, mode, guardBlocks }) };
  if (String(picked).trim()) return { disabled: false, reason: "" };
  return { disabled: true, reason: ran ? PICK_ANOTHER : PICK_FIRST };
}

// "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" -> "Qwen2.5-1.5B"
export const shortModelName = (id) =>
  String(id ?? "")
    .replace(/-q4f16_1-MLC$/, "")
    .replace(/-Instruct$/, "");

const LIVE_BUTTON = { action: "live", label: "Use the live AI" };
const RECORDED_BUTTON = { action: "replay", label: "Use recorded runs" };
const RECORDED_TEXT = "Running on: recorded runs (real answers saved earlier)";

// The quiet line under the question row. kind is the model bar kind: "ready" (live in use), "replay" (recorded in use),
// "loading", or "not-loaded". mode is what is in use ("none", "replay", "live"); pref is what is chosen: "live" (not
// loaded yet), "replay", "failed" (the load failed and nothing else was chosen) or "" (not decided yet).
// error: why the last load failed. demo: a Try these button switched to recorded runs. recordedFailed: data/recorded-runs.json
// could not be read. Returns the sentence and the one text button next to it.
export function runLine({
  kind,
  mode = "none",
  pref = "",
  modelId = "",
  pct = 0,
  error = "",
  demo = false,
  recordedFailed = false,
} = {}) {
  if (kind === "loading") return { text: `${LOADING_TEXT} ${pct}%`, button: null };
  const lost = error ? `Could not load the live AI: ${error}. ` : "";
  if (kind === "ready")
    return { text: `Running on: live AI (${shortModelName(modelId)}, ready)`, button: RECORDED_BUTTON };
  if (kind === "replay" || mode === "replay")
    return { text: `${lost}${RECORDED_TEXT}${demo ? ". Recorded demo." : ""}`, button: LIVE_BUTTON };
  if (pref === "failed")
    return {
      text: recordedFailed
        ? `${lost}Recorded runs did not load either. Open this page over http.`
        : `${lost}Recorded runs are available.`,
      button: recordedFailed ? null : RECORDED_BUTTON,
    };
  if (pref === "live")
    return { text: "Running on: live AI (not loaded yet, loads on first ask)", button: RECORDED_BUTTON };
  if (recordedFailed)
    return {
      text: "Recorded runs did not load. Open this page over http, or use the live AI.",
      button: LIVE_BUTTON,
    };
  return { text: "Getting ready.", button: null };
}

// The hint next to RUN CASE on screen 1 while no mode is running yet. "" means: leave the hint alone.
export function runHint({ kind = "", pct = 0, mode = "none", pref = "" } = {}) {
  if (kind === "loading") return `${LOADING_TEXT} ${pct}%`;
  if (mode !== "none") return "";
  if (pref === "failed") return "The live AI did not load. Use recorded runs, or press Load model to try again.";
  if (pref === "live") return "Runs the question from step 2. The first run loads the AI (about 880 MB).";
  return "";
}
