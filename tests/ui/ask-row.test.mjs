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
  TYPED_NEEDS_LIVE,
  TYPED_GUARD_ONLY,
  typedHint,
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

test("run line: recorded runs, with a button to switch to live", () => {
  const r = runLine({ kind: "replay" });
  assert.equal(r.text, "Running on: recorded runs (real answers saved earlier).");
  assert.deepEqual(r.button, { action: "live", label: "Use the live AI instead (about 880 MB)" });
});

test("run line: live AI, with a button back to recorded runs", () => {
  const r = runLine({ kind: "ready", modelId: "Qwen2.5-1.5B-Instruct-q4f16_1-MLC" });
  assert.equal(r.text, "Running on: live AI (Qwen2.5-1.5B).");
  assert.deepEqual(r.button, { action: "replay", label: "Use recorded runs" });
});

test("run line: loading shows the percent and no button", () => {
  assert.deepEqual(runLine({ kind: "loading", pct: 40 }), { text: "Loading the live AI: 40%.", button: null });
});

test("run line: a failed live load while on recorded runs says so and keeps the recorded line", () => {
  const r = runLine({ kind: "not-loaded", mode: "replay", failed: true });
  assert.equal(r.text, "The live AI did not load. Running on: recorded runs (real answers saved earlier).");
  assert.equal(r.button.action, "live");
});

test("run line: recorded runs could not be read, or are still starting", () => {
  assert.match(runLine({ kind: "not-loaded", recordedFailed: true }).text, /Recorded runs did not load/);
  assert.equal(runLine({ kind: "not-loaded", recordedFailed: true }).button.action, "live");
  const start = runLine({ kind: "not-loaded" });
  assert.match(start.text, /^Starting recorded runs/);
  assert.equal(start.button, null);
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

test("no mode yet while recorded runs load: disabled with a reason, never a silent no-op click", () => {
  assert.deepEqual(askState({ typed: EXAMPLES[0], starting: true, mode: "none" }), {
    disabled: true,
    reason: STARTING,
  });
  assert.equal(askState({ typed: EXAMPLES[0], starting: true, ready: false }).reason, NOT_READY);
});
