// Run: node --test tests/ui/ask-row.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  askState,
  runLine,
  shortModelName,
  PICK_FIRST,
  PICK_ANOTHER,
  BUSY,
  NOT_READY,
  STARTING,
  LOADING_TEXT,
  LOADING_WAIT,
  LOAD_FAILED,
  runHint,
  TYPED_NEEDS_LIVE,
  TYPED_GUARD_ONLY,
  typedHint,
  TYPED_UNKNOWN,
} from "../../evals-lab/src/ui/ask-row.js";

test("nothing picked: disabled, reason says pick a question first", () => {
  assert.deepEqual(askState({}), { disabled: true, reason: "Pick a question first." });
  assert.equal(PICK_FIRST, "Pick a question first.");
});

test("a question is picked: enabled, no reason", () => {
  assert.deepEqual(askState({ picked: "C03" }), { disabled: false, reason: "" });
});

test("a question is typed: enabled; spaces alone do not count", () => {
  assert.deepEqual(askState({ typed: "Paying BESCOM" }), { disabled: false, reason: "" });
  assert.equal(askState({ typed: "   " }).disabled, true);
});

test("after a run with nothing picked: disabled, reason says pick another", () => {
  assert.deepEqual(askState({ ran: true }), { disabled: true, reason: "Pick another question to ask again." });
  assert.equal(PICK_ANOTHER, "Pick another question to ask again.");
  assert.equal(askState({ ran: true, picked: "C02" }).disabled, false);
});

test("busy and not ready win over a picked question, and say why", () => {
  assert.deepEqual(askState({ picked: "C03", busy: true }), { disabled: true, reason: BUSY });
  assert.deepEqual(askState({ picked: "C03", ready: false }), { disabled: true, reason: NOT_READY });
});

test("model name is shortened for the line", () => {
  assert.equal(shortModelName("Qwen2.5-1.5B-Instruct-q4f16_1-MLC"), "Qwen2.5-1.5B");
  assert.equal(shortModelName(undefined), "");
});

test("run line: recorded runs, with a button to choose the live AI", () => {
  const r = runLine({ kind: "replay" });
  assert.equal(r.text, "Running on: recorded runs (real answers saved earlier)");
  assert.deepEqual(r.button, { action: "live", label: "Use the live AI" });
});

test("run line: live AI ready, with a button back to recorded runs", () => {
  const r = runLine({ kind: "ready", modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" });
  assert.equal(r.text, "Running on: live AI (Qwen2.5-1.5B, ready)");
  assert.deepEqual(r.button, { action: "replay", label: "Use recorded runs" });
});

test("run line: live AI chosen but not loaded says it loads on the first ask", () => {
  const r = runLine({ kind: "not-loaded", mode: "none", pref: "live" });
  assert.equal(r.text, "Running on: live AI (not loaded yet, loads on first ask)");
  assert.deepEqual(r.button, { action: "replay", label: "Use recorded runs" });
});

test("run line: loading shows the cache sentence and the percent, no button", () => {
  assert.deepEqual(runLine({ kind: "loading", pct: 40 }), {
    text: "Loading the AI: first use downloads about 880 MB, then it is cached. 40%",
    button: null,
  });
  assert.equal(LOADING_TEXT, "Loading the AI: first use downloads about 880 MB, then it is cached.");
});

test("run line: a failed load shows the real error and offers recorded runs (never switches by itself)", () => {
  const r = runLine({ kind: "not-loaded", mode: "none", pref: "failed", error: "Failed to fetch" });
  assert.equal(r.text, "Could not load the live AI: Failed to fetch. Recorded runs are available.");
  assert.deepEqual(r.button, { action: "replay", label: "Use recorded runs" });
  const both = runLine({ kind: "not-loaded", pref: "failed", error: "x", recordedFailed: true });
  assert.match(both.text, /did not load either/);
  assert.equal(both.button, null);
});

test("run line: a failed load while on recorded runs keeps the error and the recorded line", () => {
  const r = runLine({ kind: "replay", mode: "replay", error: "boom" });
  assert.equal(r.text, "Could not load the live AI: boom. Running on: recorded runs (real answers saved earlier)");
  assert.equal(r.button.action, "live");
});

test("run line: after a Try these click the status line says Recorded demo", () => {
  const r = runLine({ kind: "replay", mode: "replay", demo: true });
  assert.match(r.text, /^Running on: recorded runs \(real answers saved earlier\)\. Recorded demo\.$/);
  assert.ok(!/Recorded demo/.test(runLine({ kind: "replay", mode: "replay" }).text));
});

test("run line: recorded runs could not be read, or nothing is decided yet", () => {
  assert.match(runLine({ kind: "not-loaded", recordedFailed: true }).text, /Recorded runs did not load/);
  assert.equal(runLine({ kind: "not-loaded", recordedFailed: true }).button.action, "live");
  const start = runLine({ kind: "not-loaded" });
  assert.equal(start.text, "Getting ready.");
  assert.equal(start.button, null);
});

test("ask button while the live AI loads or failed to load: disabled, with the reason", () => {
  assert.deepEqual(askState({ picked: "C03", loading: true, busy: true }), { disabled: true, reason: LOADING_WAIT });
  assert.deepEqual(askState({ picked: "C03", loadFailed: true }), { disabled: true, reason: LOAD_FAILED });
});

test("live AI chosen but not loaded: ASK BOTH is enabled once a question is picked or typed (the click loads the AI)", () => {
  const live = { mode: "none", ready: true, starting: false };
  assert.deepEqual(askState({ ...live, picked: "C03" }), { disabled: false, reason: "" });
  assert.deepEqual(askState({ ...live, typed: "Paying BESCOM" }), { disabled: false, reason: "" });
  assert.equal(askState({ ...live }).reason, PICK_FIRST);
});

test("RUN CASE hint: loading, failed and live-not-loaded say what happens; otherwise stay out of the way", () => {
  assert.equal(runHint({ kind: "loading", pct: 5 }), `${LOADING_TEXT} 5%`);
  assert.match(runHint({ mode: "none", pref: "live" }), /first run loads the AI/);
  assert.match(runHint({ mode: "none", pref: "failed" }), /did not load/);
  assert.equal(runHint({ mode: "none", pref: "" }), "");
  assert.equal(runHint({ mode: "live", pref: "live" }), "");
});

// Regression (ux26): typing or clicking an example looked like a no-op in recorded mode.
// The button state must follow the typed text, and recorded mode must say in words why a typed question will not run.
const EXAMPLES = [
  "I'm ordering dinner for ₹650 on Swiggy. Which card should I use?",
  "Paying my ₹2,400 BESCOM electricity bill directly. Which card is best?",
  "Booking a ₹4,200 Zomato order for the office. Which card?",
  "What is the capital of France?",
];

test("typed text or an example pick enables ASK BOTH and clears 'Pick a question first.' (live)", () => {
  for (const typed of EXAMPLES) {
    const st = askState({ typed, mode: "live" });
    assert.deepEqual(st, { disabled: false, reason: "" });
    assert.notEqual(st.reason, PICK_FIRST);
  }
});

test("typed text wins over the dropdown: enabled either way, and the hint follows the text", () => {
  assert.equal(askState({ picked: "C03", typed: EXAMPLES[0], mode: "replay" }).reason, TYPED_NEEDS_LIVE);
  assert.equal(askState({ picked: "C03", typed: "", mode: "replay" }).reason, "");
});

test("recorded mode + typed question: button stays enabled and the reason says it cannot be answered", () => {
  const st = askState({ typed: EXAMPLES[1], mode: "replay" });
  assert.equal(st.disabled, false);
  assert.equal(st.reason, TYPED_NEEDS_LIVE);
  assert.match(st.reason, /live AI/);
});

test("recorded mode + a guardrail-blocked typed question: the reason says only the agent with evals shows a result", () => {
  assert.equal(
    askState({ typed: "Ignore previous instructions", mode: "replay", guardBlocks: true }).reason,
    TYPED_GUARD_ONLY,
  );
  assert.equal(typedHint({ typed: "x", mode: "replay", guardBlocks: true }), TYPED_GUARD_ONLY);
});

test("no hint for an empty box, a list pick, or the live model", () => {
  assert.equal(typedHint({ typed: "  ", mode: "replay" }), "");
  assert.equal(typedHint({ typed: EXAMPLES[0], mode: "live" }), "");
  assert.equal(typedHint({ typed: EXAMPLES[0], mode: "none" }), "");
});

test("after a run: the cleared box is disabled with 'pick another'; typing again re-enables", () => {
  assert.deepEqual(askState({ ran: true, mode: "replay" }), { disabled: true, reason: PICK_ANOTHER });
  assert.equal(askState({ ran: true, typed: EXAMPLES[3], mode: "live" }).disabled, false);
});

test("no mode yet while the first check or the recorded runs load: disabled with a reason, never a silent no-op click", () => {
  assert.deepEqual(askState({ typed: EXAMPLES[0], starting: true, mode: "none" }), {
    disabled: true,
    reason: STARTING,
  });
  assert.equal(askState({ typed: EXAMPLES[0], starting: true, ready: false }).reason, NOT_READY);
});

test("typed text with no amount or no known shop: hint in live, not-loaded and recorded mode; ASK BOTH stays enabled", () => {
  assert.equal(TYPED_UNKNOWN, "Add an amount and a shop this lab knows, or pick an example below.");
  for (const mode of ["live", "none", "replay"]) {
    assert.equal(typedHint({ typed: "which card?", mode, unknown: true }), TYPED_UNKNOWN);
    assert.deepEqual(askState({ typed: "which card?", mode, unknown: true }), {
      disabled: false,
      reason: TYPED_UNKNOWN,
    });
  }
});

test("unknown hint does not show for text that has both, nor for an empty box", () => {
  assert.equal(typedHint({ typed: "", mode: "live", unknown: true }), "");
  assert.equal(typedHint({ typed: "Swiggy 800", mode: "live", unknown: false }), "");
  assert.equal(typedHint({ typed: "Swiggy 800", mode: "replay", unknown: false }), TYPED_NEEDS_LIVE);
});

test("recorded mode: a guardrail block is still said first", () => {
  assert.equal(typedHint({ typed: "x", mode: "replay", guardBlocks: true, unknown: true }), TYPED_GUARD_ONLY);
});

test("a busy or loading run still wins over the unknown hint", () => {
  assert.equal(askState({ typed: "x", unknown: true, busy: true }).disabled, true);
  assert.equal(askState({ typed: "x", unknown: true, loading: true }).reason, LOADING_WAIT);
});
