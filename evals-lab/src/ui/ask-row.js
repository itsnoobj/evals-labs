// Words and state for the one call-to-action row on Side by side: the ASK BOTH button and the "Running on" line.
// Pure: plain data in, plain data out. No DOM. Exports: PICK_FIRST, PICK_ANOTHER, STARTING, TYPED_NEEDS_LIVE,
// TYPED_GUARD_ONLY, typedHint, askState, shortModelName, runLine.

export const PICK_FIRST = "Pick a question first.";
export const PICK_ANOTHER = "Pick another question to ask again.";
export const BUSY = "A run is going. Wait for it to finish.";
export const NOT_READY = 'Recorded runs did not load. Open "Change how it runs" below.';

export const STARTING = "Recorded runs are starting. Wait a moment.";
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
// starting: no mode is chosen yet and recorded runs are still loading. mode, guardBlocks: see typedHint.
// Returns { disabled, reason }. The reason is shown next to the button; an enabled button can carry a hint (typed text in recorded mode).
export function askState({
  picked = "",
  typed = "",
  ran = false,
  busy = false,
  ready = true,
  starting = false,
  mode = "",
  guardBlocks = false,
} = {}) {
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

const LIVE_BUTTON = { action: "live", label: "Use the live AI instead (about 880 MB)" };
const REPLAY_TEXT = "Running on: recorded runs (real answers saved earlier).";

// The quiet line under the question row. kind is the model bar kind: "ready" (live in use), "replay" (recorded in use),
// "loading", or "not-loaded". mode is the chosen mode ("none", "replay", "live"). failed: the live AI did not load.
// recordedFailed: data/recorded-runs.json could not be read. Returns the sentence and the one text button next to it.
export function runLine({ kind, mode = "none", modelId = "", pct = 0, failed = false, recordedFailed = false } = {}) {
  if (kind === "ready")
    return {
      text: `Running on: live AI (${shortModelName(modelId)}).`,
      button: { action: "replay", label: "Use recorded runs" },
    };
  if (kind === "loading") return { text: `Loading the live AI: ${pct}%.`, button: null };
  if (kind === "replay" || mode === "replay")
    return { text: `${failed ? "The live AI did not load. " : ""}${REPLAY_TEXT}`, button: LIVE_BUTTON };
  if (recordedFailed)
    return {
      text: `${failed ? "The live AI did not load. " : ""}Recorded runs did not load. Open this page over http, or load the live AI.`,
      button: LIVE_BUTTON,
    };
  return { text: "Starting recorded runs (real answers saved earlier).", button: null };
}
